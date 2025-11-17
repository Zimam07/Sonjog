import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { Heart, MessageCircle, Bookmark, Trash2, Send } from 'lucide-react';
import CreatePost from './CreatePost';
import StoryViewer from './StoryViewer';
import StoryUploader from './StoryUploader';
import ReelGrid from './ReelGrid';
import ReelUploader from './ReelUploader';
import parseCaptionToElements from '../lib/parseCaptionToElements.jsx';

const API_URL = 'http://localhost:8000/api/v1/post';

export default function Home() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userId = user && user._id;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState({});

  useEffect(() => {
    fetchPosts(1);
    // infinite scroll
    const onScroll = () => {
      if (!hasMore || loadingMore) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom) {
        fetchPosts(page + 1);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const fetchPosts = async (targetPage = 1) => {
    try {
      if (targetPage === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await axios.get(`${API_URL}/all?page=${targetPage}&limit=10`, {
        withCredentials: true,
      });
      if (res.data.success) {
        if (targetPage === 1) {
          setPosts(res.data.posts);
        } else {
          setPosts((prev) => [...prev, ...res.data.posts]);
        }
        setPage(targetPage);
        const total = res.data.pagination?.total || 0;
        const limit = res.data.pagination?.limit || 10;
        const fetched = targetPage * limit;
        setHasMore(fetched < total);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const likeHandler = async (postId) => {
    try {
      const res = await axios.get(`${API_URL}/${postId}/like`, {
        withCredentials: true,
      });
      if (res.data.success) {
        // Update local post state
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
              if (post._id === postId) {
              const isLiked = post.likes.includes(userId);
              return {
                ...post,
                likes: isLiked
                  ? post.likes.filter((id) => id !== userId)
                  : [...post.likes, userId],
              };
            }
            return post;
          })
        );
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const dislikeHandler = async (postId) => {
    try {
      const res = await axios.get(`${API_URL}/${postId}/dislike`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
              if (post._id === postId) {
              return {
                ...post,
                likes: post.likes.filter((id) => id !== userId),
              };
            }
            return post;
          })
        );
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const bookmarkHandler = async (postId) => {
    try {
      const res = await axios.get(`${API_URL}/${postId}/bookmark`, {
        withCredentials: true,
      });
      if (res.data.success) {
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deletePostHandler = async (postId) => {
    try {
      const res = await axios.delete(`${API_URL}/delete/${postId}`, {
        withCredentials: true,
      });
      if (res.data.success) {
        setPosts(posts.filter((post) => post._id !== postId));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const commentHandler = async (postId) => {
    try {
      const commentText = newComment[postId];
      if (!commentText) {
        toast.error('Comment cannot be empty');
        return;
      }

      const res = await axios.post(
        `${API_URL}/${postId}/comment`,
        { text: commentText },
        { withCredentials: true }
      );

      if (res.data.success) {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post._id === postId) {
              return {
                ...post,
                comments: [...post.comments, res.data.comment],
              };
            }
            return post;
          })
        );
        setNewComment({ ...newComment, [postId]: '' });
        toast.success(res.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-white">Loading posts...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Create Post Form */}
  <StoryViewer />
  <StoryUploader />
  <CreatePost />
  <ReelUploader />
  <ReelGrid />

      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No posts yet</div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Post Header */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img
                    src={(post.author && post.author.profilePicture) || 'https://via.placeholder.com/40'}
                    alt={(post.author && post.author.username) || 'Deleted user'}
                    className="w-11 h-11 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{(post.author && post.author.username) || 'Deleted user'}</h3>
                    <p className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {post.author && post.author._id === userId && (
                  <button
                    onClick={() => deletePostHandler(post._id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Post Image */}
              {post.image && (
                <div className="w-full bg-gray-100">
                  <img
                    src={post.image}
                    alt="Post"
                    className="w-full max-h-[600px] object-cover"
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      post.likes && post.likes.includes(userId)
                        ? dislikeHandler(post._id)
                        : likeHandler(post._id)
                    }
                    className={`p-2 rounded-full hover:bg-gray-100 transition ${(post.likes && post.likes.includes(userId)) ? 'text-red-500' : 'text-gray-600'}`}
                  >
                    <Heart size={20} />
                  </button>

                  <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                    <MessageCircle size={20} />
                  </button>

                  <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                    <Send size={20} />
                  </button>
                </div>

                <div>
                  <button onClick={() => bookmarkHandler(post._id)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
                    <Bookmark size={20} />
                  </button>
                </div>
              </div>

              {/* Likes & Caption */}
              <div className="px-4 pb-3">
                <div className="text-sm font-semibold text-gray-900">{(post.likes && post.likes.length) || 0} likes</div>
                {post.caption && (
                  <div className="text-sm text-gray-800 mt-1">
                    <span className="font-semibold mr-2">{(post.author && post.author.username) || 'Deleted user'}</span>
                    <span>{parseCaptionToElements(post.caption)}</span>
                  </div>
                )}
                {post.comments && post.comments.length > 0 && (
                  <div className="text-sm text-gray-500 mt-2">View all {post.comments.length} comments</div>
                )}
              </div>

              {/* Comments Section */}
              <div className="px-4 pt-2 pb-4">
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-3">
                    {post.comments.slice(0, 3).map((comment) => (
                      <div key={comment._id} className="flex gap-3 items-start">
                        <img
                          src={(comment.author && comment.author.profilePicture) || 'https://via.placeholder.com/32'}
                          alt={(comment.author && comment.author.username) || 'Deleted user'}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="text-sm"><span className="font-semibold text-gray-900 mr-2">{(comment.author && comment.author.username) || 'Deleted user'}</span><span className="text-gray-700">{comment.text}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment[post._id] || ''}
                    onChange={(e) =>
                      setNewComment({ ...newComment, [post._id]: e.target.value })
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        commentHandler(post._id);
                      }
                    }}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                  />
                  <button
                    onClick={() => commentHandler(post._id)}
                    className="text-sm text-purple-600 font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        {loadingMore && (
          <div className="text-center py-6 text-gray-400">Loading more posts...</div>
        )}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-6 text-gray-400">No more posts</div>
        )}
      </div>
    </div>
  );
}
