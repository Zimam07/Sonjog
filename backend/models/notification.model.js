import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // like, comment, follow, dislike, etc.
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // actor
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  message: { type: String },
  read: { type: Boolean, default: false },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);
