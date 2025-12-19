import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  expiresAt: { type: Date },
  // Optional scheduled publish time. If present and in the future, story will be published at this time.
  scheduledAt: { type: Date },
  // Story status: 'scheduled' means waiting to be published, 'active' means currently visible
  status: { type: String, enum: ['scheduled', 'active'], default: 'active' },
  // When story was published (set when status becomes 'active')
  publishedAt: { type: Date },
  // Temporary path on disk for deferred uploads (when scheduled)
  tempPath: { type: String },
}, { timestamps: true });

// TTL index: expire stories when expiresAt is reached
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Story = mongoose.model('Story', storySchema);
