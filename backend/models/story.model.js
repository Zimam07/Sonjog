import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// TTL index: expire stories when expiresAt is reached
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = mongoose.model('Story', storySchema);
