import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }]
},{timestamps:true});
export const Conversation = mongoose.model('Conversation', conversationSchema);