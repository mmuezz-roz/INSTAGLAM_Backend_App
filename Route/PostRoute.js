import express from "express";
// import { createPost, getUserPosts, getFeedPosts } from "../Controllers/PostController.js";
import Verifytoken from "../Middleware/Verifytoken.js";
import upload from "../Middleware/multer.js";
import { addComment, createPost, deleteComment, getFeedPosts, getUserPosts, likeUnlikePost } from "../Controller/PostController.js";

const PostRoute = express.Router();


PostRoute.post("/posts",Verifytoken,upload.array("images", 10),createPost);


PostRoute.get("/posts/:userId", Verifytoken, getUserPosts);


// 🏠 GET FEED POSTS (followers + public)
PostRoute.get( "/home",Verifytoken,getFeedPosts);



PostRoute.post(
  "/posts/:postId/like",
  Verifytoken,
  likeUnlikePost
);

PostRoute.post(
  "/posts/:postId/comment",
  Verifytoken,
  addComment
);

PostRoute.delete(
  "/posts/:postId/comment/:commentId",
  Verifytoken,
  deleteComment
);



export default PostRoute;
