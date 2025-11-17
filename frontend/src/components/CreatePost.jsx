import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { Image, X } from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1';

export default function CreatePost() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }

    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('image', imageFile);

      const res = await axios.post(`${API_URL}/post/addpost`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setCaption('');
        clearImage();
        // Optionally refresh posts or add to Redux state
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Post</h2>

      <form onSubmit={handleCreatePost} className="space-y-4">
        {/* Caption */}
        <div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={300}
            rows="3"
            disabled={loading}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded resize-none text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">{caption.length}/300 characters</p>
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-96 object-cover rounded border border-gray-200"
            />
            <button
              type="button"
              onClick={clearImage}
              disabled={loading}
              className="absolute top-2 right-2 bg-white hover:bg-gray-50 text-gray-700 rounded-full p-2 transition border border-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Image Upload */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded cursor-pointer transition disabled:opacity-50">
            <Image size={18} />
            <span>Select Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={loading}
              className="hidden"
            />
          </label>
          {previewUrl && (
            <span className="text-sm text-gray-400">Image selected</span>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => {
              setCaption('');
              clearImage();
            }}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={loading || !imageFile || !caption.trim()}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
