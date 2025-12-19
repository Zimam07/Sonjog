import mongoose, { Schema } from 'mongoose';

const groupSchema = new Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, default: true },
  description: { type: String, default: '' },
}, { timestamps: true });

// ensure owner is also a member
groupSchema.pre('save', function(next) {
  if (this.owner && !this.members.find(m => String(m) === String(this.owner))) {
    this.members.push(this.owner);
  }
  next();
});

export const Group = mongoose.model('Group', groupSchema);
