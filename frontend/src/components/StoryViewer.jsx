import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import StoryModal from './StoryModal';
import { API_URL } from '../lib/config';
const MEDIA_API = `${API_URL}/media`;

// Horizontal strip of stories with an optional leading "Create" card.
export default function StoryViewer({ onCreate, createImage }) {
  const [stories, setStories] = useState([]);
  const [index, setIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchStories();
    const handler = (e) => {
      // refresh when new story uploaded
      if (!e?.detail || e.detail.type === 'story') fetchStories();
    };
    window.addEventListener('media:uploaded', handler);
    return () => window.removeEventListener('media:uploaded', handler);
  }, []);

  useEffect(() => {
    if (stories.length === 0) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % stories.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [stories]);

  const fetchStories = async () => {
    try {
      const res = await axios.get(`${MEDIA_API}/story/all`, { withCredentials: true });
      if (res.data.success) {
        // normalize field names to frontend-friendly shape
        const normalized = (res.data.stories || []).map((st) => ({
          _id: st._id,
          mediaUrl: st.mediaUrl || st.url || st.videoUrl,
          mediaType: st.mediaType || (st.mediaUrl?.includes('video') || st.videoUrl?.includes('.mp4') ? 'video' : 'image'),
          author: st.author,
          createdAt: st.createdAt,
          publishedAt: st.publishedAt,
        }));
        setStories(normalized);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleStoryDeleted = (storyId) => {
    setStories((prev) => prev.filter((s) => s._id !== storyId));
  };

  const openModal = (idx) => {
    setSelectedStoryIndex(idx);
    setShowModal(true);
  };

  return (
    <>
      <div className="mb-4">
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {/* Create story card */}
          <button
            onClick={onCreate}
            className="relative min-w-[120px] h-48 rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-100 dark:bg-gray-800"
          >
            <img
              src={createImage || 'https://via.placeholder.com/300x500?text=Create'}
              alt="Create story"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-sky-600 text-3xl font-bold shadow-lg border border-sky-100">+</div>
              <div className="text-white text-sm font-semibold drop-shadow">Create story</div>
            </div>
          </button>

          {/* Other stories */}
          {stories.length === 0 ? (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 px-2">No stories yet</div>
          ) : (
            stories.map((s, idx) => (
              <div
                key={s._id}
                className={`relative min-w-[120px] h-48 rounded-xl overflow-hidden shadow-md border flex-shrink-0 cursor-pointer transition hover:scale-105 ${idx === index ? 'border-sky-500' : 'border-gray-200 dark:border-gray-700'}`}
                onClick={() => openModal(idx)}
              >
                {s.mediaType === 'image' ? (
                  <img src={s.mediaUrl} alt="story" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <video src={s.mediaUrl} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-2 left-2 w-10 h-10 rounded-full ring-2 ring-white overflow-hidden">
                  <img src={s.author?.profilePicture || 'https://via.placeholder.com/40'} alt={s.author?.username} className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-2 left-2 right-2 text-white text-sm font-semibold line-clamp-1 drop-shadow">{s.author?.username || 'Story'}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <StoryModal
          stories={stories}
          initialIndex={selectedStoryIndex}
          onClose={() => setShowModal(false)}
          onStoryDeleted={handleStoryDeleted}
        />
      )}
    </>
  );
}
