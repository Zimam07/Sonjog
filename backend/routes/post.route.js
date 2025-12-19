import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { upload } from "../middlewares/multer.js";
import { addComment, addNewPost, bookmarkPost, deletePost, dislikePost, getAllPost, getCommentsOfPost, getSavedPosts, getUserPost, likePost, searchPosts, updatePost } from "../controllers/post.controller.js";

const router = express.Router();

router.route("/addpost").post(isAuthenticated, upload.single('image'), addNewPost);
router.route("/all").get(isAuthenticated,getAllPost);
router.route('/search').get(isAuthenticated, searchPosts);
router.route('/saved').get(isAuthenticated, getSavedPosts);
router.route("/userpost/all").get(isAuthenticated, getUserPost);
router.route("/:id/like").get(isAuthenticated, likePost);
router.route("/:id/dislike").get(isAuthenticated, dislikePost);
router.route("/:id/comment").post(isAuthenticated, addComment); 
router.route("/:id/comment/all").post(isAuthenticated, getCommentsOfPost);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/edit/:id").put(isAuthenticated, upload.single('image'), updatePost);
router.route("/:id/bookmark").get(isAuthenticated, bookmarkPost);

export default router;

