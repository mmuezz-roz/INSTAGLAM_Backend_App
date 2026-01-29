
import { NotificationModel } from "../Models/Notification.js";


    
export const getNotifications = async (req, res) => {
  const notifications = await NotificationModel.find({
    receiver: req.user._id,
  })
    .populate("sender", "username profilePic")
    .populate("post", "images")
    .sort({ createdAt: -1 });

  const unreadCount = await NotificationModel.countDocuments({
    receiver: req.user._id,
    isRead: false,
  });

  res.json({ notifications, unreadCount });
};

export const getUnreadCount = async (req, res) => {
  const count = await NotificationModel.countDocuments({
    receiver: req.user._id,
    isRead: false,
  });

  res.json({ count });
};

export const markNotificationsRead = async (req, res) => {
  await NotificationModel.updateMany(
    { receiver: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.json({ success: true });
};
