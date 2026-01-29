



import cloudinary from "../config/cloudinary.js";
import { NotificationModel } from "../Models/Notification.js";
import { PostModel } from "../Models/Post.js";
import UserModel from "../Models/User.js";
import { getSocketId, io } from "../socket.js";

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
          (err, result) => (err ? reject(err) : resolve(result))
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
    if (!user) return res.status(404).json({ message: "User not found" });

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
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

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
    res.status(500).json({ message: "Failed to fetch feed" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await PostModel.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes.pull(userId);

      await NotificationModel.findOneAndDelete({
        receiver: post.user,
        sender: userId,
        post: post._id,
        type: "like",
      });

      // 🔔 SOCKET NOTIFICATION (Remove instantly)
      const socketId = getSocketId(post.user);
      if (socketId) {
        io.to(socketId).emit("newNotification");
      }
    } else {
      post.likes.push(userId);

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

        // 🔔 SOCKET NOTIFICATION
        const socketId = getSocketId(post.user);
        if (socketId) {
          io.to(socketId).emit("newNotification");
        }
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

    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    const post = await PostModel.findById(postId).populate("user");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = {
      user: userId,
      text: text.trim(),
    };

    post.comments.push(comment);
    await post.save();

    const addedComment = post.comments.at(-1);

    // 🔔 Notification (not self)
    if (post.user._id.toString() !== userId.toString()) {
      try {
        const notification = await NotificationModel.create({
          receiver: post.user._id,
          sender: userId,
          type: "comment",
          post: post._id,
          comment: addedComment._id,
        });

        const socketId = getSocketId(post.user._id.toString());
        if (socketId) {
          io.to(socketId).emit("newNotification");
        }
      } catch (notifErr) {
        console.error("Notification error:", notifErr.message);
        // ❗ DO NOT FAIL COMMENT IF NOTIFICATION FAILS
      }
    }

    await post.populate("comments.user", "username profilePic");

    res.status(201).json({
      comment: post.comments.at(-1),
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
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (
      comment.user.toString() !== userId.toString() &&
      post.user.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.deleteOne();
    await post.save();

    await NotificationModel.findOneAndDelete({
      type: "comment",
      comment: commentId,
    });

    res.json({ success: true, commentId });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete comment" });
  }
};


export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 🔒 AUTH CHECK — only owner can delete
    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 🧹 Delete related notifications
    await NotificationModel.deleteMany({ post: postId });

    // 🗑️ Delete post
    await post.deleteOne();

    res.json({
      success: true,
      postId,
    });

  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};


/* ================= LIKE / UNLIKE COMMENT ================= */
export const likeUnlikeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await PostModel.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const alreadyLiked = comment.likes.includes(userId);

    if (alreadyLiked) {
      // 🔻 UNLIKE
      comment.likes.pull(userId);

      // 🔕 Delete notification
      await NotificationModel.findOneAndDelete({
        receiver: comment.user,
        sender: userId,
        type: "comment_like",
        post: postId,
        comment: commentId,
      });
    } else {
      // ❤️ LIKE
      comment.likes.push(userId);

      // 🔔 Notification (not self)
      if (comment.user.toString() !== userId.toString()) {
        await NotificationModel.findOneAndUpdate(
          {
            receiver: comment.user,
            sender: userId,
            type: "comment_like",
            post: postId,
            comment: commentId,
          },
          {
            receiver: comment.user,
            sender: userId,
            type: "comment_like",
            post: postId,
            comment: commentId,
            isRead: false,
          },
          { upsert: true }
        );

        // 🔔 Socket
        const socketId = getSocketId(comment.user.toString());
        if (socketId) {
          io.to(socketId).emit("newNotification", { type: "comment_like" });
        }
      }
    }

    await post.save();

    res.json({
      liked: !alreadyLiked,
      likesCount: comment.likes.length,
    });
  } catch (err) {
    console.error("Comment like error:", err);
    res.status(500).json({ message: "Comment like failed" });
  }
};