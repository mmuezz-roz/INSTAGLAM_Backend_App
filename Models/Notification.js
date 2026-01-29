
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  type: {
    type: String,
    enum: ["like", "follow", "comment", "follow_request", "comment_like"],
    required: true,
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default: null,
  },

  // ✅ ONLY FOR COMMENTS
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  isRead: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ❌ NO UNIQUE INDEX FOR COMMENTS
export const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
