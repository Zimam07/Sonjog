import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
    caption:{type:String, default:''},
    image:{type:String, default:''},
    author:{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
    mentions:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    hashtags:[{type:String}],
    likes:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    comments:[{type:mongoose.Schema.Types.ObjectId, ref:'Comment'}],
},{timestamps:true});
export const Post = mongoose.model('Post', postSchema);