import {Conversation} from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import {Message} from "../models/message.model.js"
import { Group } from "../models/group.model.js";
// for chatting
export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {textMessage:message} = req.body;
      
        let conversation = await Conversation.findOne({
            participants:{$all:[senderId, receiverId]}
        });
        // establish the conversation if not started yet.
        if(!conversation){
            conversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message
        });
        if(newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save(),newMessage.save()])

        // implement socket io for real time data transfer
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (io && receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', newMessage);
        }

        return res.status(201).json({
            success:true,
            newMessage
        })
    } catch (error) {
        console.log(error);
    }
}
export const getMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all: [senderId, receiverId]}
        }).populate('messages');
        if(!conversation) return res.status(200).json({success:true, messages:[]});

        return res.status(200).json({success:true, messages:conversation?.messages});
        
    } catch (error) {
        console.log(error);
    }
}

export const sendGroupMessage = async (req, res) => {
    try {
        const senderId = req.id;
        const { groupId } = req.params;
        const { textMessage: message } = req.body;
        
        if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Message required' });
        
        const group = await Group.findById(groupId);
        if (!group || !group.members.find(m => String(m) === String(senderId))) {
            return res.status(403).json({ success: false, message: 'Not a group member' });
        }
        
        let conversation = await Conversation.findOne({ type: 'group', groupId });
        if (!conversation) {
            conversation = await Conversation.create({ type: 'group', groupId, participants: group.members });
        }
        
        const newMessage = await Message.create({ senderId, message });
        if (newMessage) conversation.messages.push(newMessage._id);
        await Promise.all([conversation.save(), newMessage.save()]);
        
        // Populate sender info before sending to socket
        const populatedMessage = await newMessage.populate('senderId', 'username profilePicture');
        
        if (io) io.to(`group-${groupId}`).emit('newMessage', { ...populatedMessage.toObject(), groupId });
        
        return res.status(201).json({ success: true, newMessage: populatedMessage });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

export const getGroupMessages = async (req, res) => {
    try {
        const userId = req.id;
        const { groupId } = req.params;
        
        const group = await Group.findById(groupId);
        if (!group || !group.members.find(m => String(m) === String(userId))) {
            return res.status(403).json({ success: false, message: 'Not a group member' });
        }
        
        const conversation = await Conversation.findOne({ type: 'group', groupId }).populate({
            path: 'messages',
            populate: { path: 'senderId', select: 'username profilePicture' }
        });
        if (!conversation) return res.json({ success: true, messages: [] });
        
        return res.json({ success: true, messages: conversation.messages });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: error.message });
    }
}