import cloudinary from "../config/cloudinary.js";
import { NotificationModel } from "../Models/Notification.js";
import { PostModel } from "../Models/Post.js";
import UserModel from "../Models/User.js";

import { getSocketId } from "../server.js";



export const createPost = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Images are required" });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "posts" },
          (err, res) => (err ? reject(err) : resolve(res))
        );
        stream.end(file.buffer);
      });

      uploadedImages.push(result.secure_url);
    }

    const user = await UserModel.findById(req.user._id);

    const post = await PostModel.create({
      user: user._id,
      images: uploadedImages,
      caption: req.body.caption || "",
      isPrivate: user.isPrivate,
    });

    res.status(201).json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Post creation failed" });
  }
};



export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user._id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔒 Private account check
    const isFollower =
      user.followers.includes(viewerId) ||
      userId.toString() === viewerId.toString();

    if (user.isPrivate && !isFollower) {
      return res.json({ posts: [] });
    }

    const posts = await PostModel.find({ user: userId })
      .populate("user", "username profilePic")
      .populate("comments.user", "username profilePic")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};



// export const getFeedPosts = async (req, res) => {
//   try {
//     const user = await UserModel.findById(req.user._id);

//     const posts = await PostModel.find({
//       $or: [
//         { user: { $in: user.following } },
//         { user: user._id },
//         { isPrivate: false },
//       ],
//     })
//       .populate("user", "username profilePic")
//       .sort({ createdAt: -1 });

//     res.json({ posts });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to fetch feed" });
//   }
// };


export const getFeedPosts = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id);

    const posts = await PostModel.find({
      user: { $in: [...user.following, user._id] },

    })
      .populate("user", "username profilePic")
      .populate("comments.user", "username profilePic")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch feed" });
  }
};





export const likeUnlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // 🔻 UNLIKE
      post.likes.pull(userId);

      // 🔕 REMOVE notification
      await NotificationModel.findOneAndDelete({
        receiver: post.user,
        sender: userId,
        post: post._id,
        type: "like",
      });

    } else {
      // ❤️ LIKE
      post.likes.push(userId);

      // 🔔 CREATE notification ONLY IF NOT EXISTS
      if (post.user.toString() !== userId.toString()) {
        await NotificationModel.findOneAndUpdate(
          {
            receiver: post.user,
            sender: userId,
            post: post._id,
            type: "like",
          },
          {
            receiver: post.user,
            sender: userId,
            post: post._id,
            type: "like",
            isRead: false,
          },
          { upsert: true, new: true }
        );
      }
    }

    await post.save();

    res.json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
    });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ message: "Like failed" });
  }
};








export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    const post = await PostModel.findById(postId).populate("user");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 💬 Create comment
    post.comments.push({
      user: userId,
      text: text.trim(),
    });

    await post.save();

    // populate ONLY latest comment user
    await post.populate("comments.user", "username profilePic");

    const newComment = post.comments.at(-1);

    // 🔔 COMMENT NOTIFICATION (if not own post)
    if (post.user._id.toString() !== userId.toString()) {
      await NotificationModel.create({
        receiver: post.user._id,
        sender: userId,
        type: "comment",
        post: post._id,
        comment: newComment._id, 
      });
    }

    res.status(201).json({
      success: true,
      comment: newComment,
    });

  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};



export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // ✅ AUTH CHECK (comment owner OR post owner)
    if (
      comment.user.toString() !== userId.toString() &&
      post.user.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 🗑️ DELETE COMMENT
    comment.deleteOne();
    await post.save();

    // 🔔 DELETE ONLY THIS COMMENT'S NOTIFICATION
    await NotificationModel.findOneAndDelete({
      type: "comment",
      comment: commentId,
    });

    res.json({
      success: true,
      commentId,
    });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Failed to delete comment" });
  }
};