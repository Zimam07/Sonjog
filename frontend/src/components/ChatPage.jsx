import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getSocketInstance } from '../lib/socketManager';
import axios from 'axios';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1';

export default function ChatPage() {
  const { user } = useSelector((state) => state.auth);
  const { id: socketId } = useSelector((state) => state.socketio);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Listen for new messages via the socket manager instance
    const socket = getSocketInstance();
    if (socket) {
      const onNewMessage = (message) => {
        if (
          (message.senderId === selectedUser?._id && message.receiverId === user._id) ||
          (message.senderId === user._id && message.receiverId === selectedUser?._id)
        ) {
          setMessages((prev) => [...prev, message]);
        }
      };

      socket.on('newMessage', onNewMessage);

      return () => {
        try { socket.off('newMessage', onNewMessage); } catch (e) {}
      };
    }
  }, [socketId, selectedUser, user]);

  useEffect(() => {
    const socket = getSocketInstance();
    if (!socket) return;

    const onTyping = ({ fromUserId }) => {
      if (selectedUser && fromUserId === selectedUser._id) setIsPeerTyping(true);
    };

    const onStopTyping = ({ fromUserId }) => {
      if (selectedUser && fromUserId === selectedUser._id) setIsPeerTyping(false);
    };

    socket.on('typing', onTyping);
    socket.on('stopTyping', onStopTyping);

    return () => {
      try { socket.off('typing', onTyping); socket.off('stopTyping', onStopTyping); } catch (e) {}
    };
  }, [socketId, selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSuggestedUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/user/suggested`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setSuggestedUsers(res.data.users);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/message/all/${userId}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setMessages(res.data.messages);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageHandler = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) {
      toast.error('Select a user and enter a message');
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/message/send/${selectedUser._id}`,
        { textMessage: newMessage },
        { withCredentials: true }
      );

      if (res.data.success) {
        setMessages([...messages, res.data.newMessage]);
        setNewMessage('');
        // notify stop typing after sending
        const s = getSocketInstance();
        if (s && selectedUser) {
          s.emit('stopTyping', { toUserId: selectedUser._id, fromUserId: user._id });
        }
        toast.success('Message sent');
      }
    } catch (error) {
      console.log(error);
      toast.error('Failed to send message');
    }
  };

  const onInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);

    const s = getSocketInstance();
    if (!s || !selectedUser) return;

    // emit typing and debounce stopTyping
    s.emit('typing', { toUserId: selectedUser._id, fromUserId: user._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit('stopTyping', { toUserId: selectedUser._id, fromUserId: user._id });
    }, 1200);
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar - Users List */}
      <div className="w-80 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="space-y-1">
          {suggestedUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className={`w-full text-left p-3 hover:bg-gray-900 transition ${
                selectedUser?._id === u._id ? 'bg-gray-800' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={u.profilePicture || 'https://via.placeholder.com/40'}
                  alt={u.username}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{u.username}</p>
                  <p className="text-sm text-gray-400 truncate">{u.bio || 'No bio'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
              <div className="border-b border-gray-700 p-4 flex items-center gap-3">
              <img
                src={selectedUser.profilePicture || 'https://via.placeholder.com/40'}
                alt={selectedUser.username}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="font-semibold">{selectedUser.username}</p>
                <p className="text-sm text-gray-400">
                  {selectedUser.followers?.length || 0} followers
                </p>
                {isPeerTyping && (
                  <p className="text-xs text-green-400">typing...</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <p className="text-center text-gray-400">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-400">No messages yet. Start a conversation!</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.senderId === user._id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.senderId === user._id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-100'
                      }`}
                    >
                      <p>{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={sendMessageHandler}
              className="border-t border-gray-700 p-4 flex gap-2"
            >
              <input
                type="text"
                value={newMessage}
                onChange={onInputChange}
                placeholder="Type a message..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 flex items-center justify-center"
              >
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
