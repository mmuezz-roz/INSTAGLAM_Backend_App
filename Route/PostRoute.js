import express from "express";
// import { createPost, getUserPosts, getFeedPosts } from "../Controllers/PostController.js";
import Verifytoken from "../Middleware/Verifytoken.js";
import upload from "../Middleware/multer.js";
import { addComment, createPost, deleteComment, deletePost, getFeedPosts, getUserPosts, likeUnlikeComment, likeUnlikePost } from "../Controller/PostController.js";

const PostRoute = express.Router();

// Protect all routes in this router
PostRoute.use(Verifytoken);

PostRoute.post("/posts", upload.array("images", 10), createPost);


PostRoute.get("/posts/:userId", getUserPosts);


// 🏠 GET FEED POSTS (followers + public)
PostRoute.get("/home", getFeedPosts);



PostRoute.post(
  "/posts/:postId/like",
  likeUnlikePost
);

PostRoute.post(
  "/posts/:postId/comment",
  addComment
);

PostRoute.delete(
  "/posts/:postId/comment/:commentId",
  deleteComment
);

PostRoute.post(
  "/posts/:postId/comment/:commentId/like",
  likeUnlikeComment
);


PostRoute.delete(
  "/posts/:postId",
  deletePost
);



export default PostRoute;
