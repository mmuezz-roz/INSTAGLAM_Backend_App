
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
    enum: ["like", "follow", "comment","follow_request"],
    required: true,
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default: null,
  },

  isRead: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }


});
NotificationSchema.index(
  {
    receiver: 1,
    sender: 1,
    post: 1,
    comment: 1,
    type: 1,
  },
  { unique: true }
);



export const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);


// const NotificationSchema = new mongoose.Schema({
//   receiver: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   sender: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   type: {
//     type: String,
//     enum: ["like", "comment", "follow", "follow_request"],
//     required: true,
//   },
//   post: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Post",
//   },
//   isRead: {
//     type: Boolean,
//     default: false,
//   },
//    createdAt: {
//      type: Date,
//      default: Date.now,
//   }
// }, { timestamps: true });

// NotificationSchema.index(
//   { receiver: 1, sender: 1, post: 1, type: 1 },
//   { unique: true, partialFilterExpression: { type: "like" } }
// );

//  export const NotificationModel =
//    mongoose.models.Notification ||
//    mongoose.model("Notification", NotificationSchema);
