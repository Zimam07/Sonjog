import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api/v1/media';

export default function ReelGrid() {
  const [reels, setReels] = useState([]);

  useEffect(() => {
    fetchReels();
    const handler = (e) => {
      if (!e?.detail || e.detail.type === 'reel') fetchReels();
    };
    window.addEventListener('media:uploaded', handler);
    return () => window.removeEventListener('media:uploaded', handler);
  }, []);

  const fetchReels = async () => {
    try {
      const res = await axios.get(`${API}/reel/all`, { withCredentials: true });
      if (res.data.success) {
        // normalize to use r.url for frontend
        const normalized = (res.data.reels || []).map((r) => ({
          _id: r._id,
          url: r.videoUrl || r.url,
          caption: r.caption || r.captionText || '',
          author: r.author,
        }));
        setReels(normalized);
      }
    } catch (e) {
      console.log(e);
    }
  };

  if (reels.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 my-6">
      {reels.map((r) => (
        <div key={r._id} className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm">
          <div className="w-full bg-gray-50">
            <video src={r.url} controls className="w-full h-64 object-cover" />
          </div>
          <div className="p-3 text-sm text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">{r.author?.username || 'User'}</div>
            <div className="text-gray-600">{r.caption || ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
