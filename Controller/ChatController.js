import Conversation from "../Models/Conversation.js";
import Message from "../Models/Message.js";
import UserModel from "../Models/User.js";
import mongoose from "mongoose";


export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    // Validate inputs
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID provided" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    if (userId.toString() === myId.toString()) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    // Check if target user exists
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find existing conversation
    let convo = await Conversation.findOne({
      $and: [
        { participants: myId },
        { participants: userId }
      ]
    }).populate("participants", "username profilePic");

    if (convo) {
      return res.json(convo);
    }

    // Create new conversation
    convo = await Conversation.create({
      participants: [myId, userId],
    });

    // Fetch and populate the new document
    convo = await Conversation.findById(convo._id)
      .populate("participants", "username profilePic");

    res.json(convo);
  } catch (err) {
    console.error("❌ CONVERSATION ERROR:", err.message);
    res.status(500).json({
      message: "Server error creating conversation",
      error: err.message
    });
  }
};


export const getMyConversations = async (req, res) => {
  const convos = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "username profilePic followers following")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

  res.json(convos);
};

export const getMessages = async (req, res) => {
  const messages = await Message.find({
    conversation: req.params.conversationId,
  }).sort({ createdAt: 1 });

  res.json(messages);
};

export const getUnreadCounts = async (req, res) => {
  const counts = await Message.aggregate([
    {
      $match: {
        isRead: false,
        sender: { $ne: req.user._id },
      },
    },
    {
      $group: {
        _id: "$conversation",
        count: { $sum: 1 },
      },
    },
  ]);

  res.json(counts);
};

export const searchAUsers = async (req, res) => {
  const q = req.query.q;

  if (!q) return res.json({ users: [] });

  const users = await UserModel.find({
    _id: { $ne: req.user._id },
    username: { $regex: q, $options: "i" },
    followers: req.user._id, // 👈 ONLY FOLLOWED USERS
  }).select("_id username profilePic");

  res.json({ users });
};

export const markConversationRead = async (req, res) => {
  await Message.updateMany(
    {
      conversation: req.params.conversationId,
      sender: { $ne: req.user._id },
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  res.json({ success: true });
};


export const markAllRead = async (req, res) => {
  try {
    const myConvos = await Conversation.find({ participants: req.user._id }).select("_id");
    const convoIds = myConvos.map(c => c._id);

    await Message.updateMany(
      {
        conversation: { $in: convoIds },
        sender: { $ne: req.user._id },
        isRead: false,
      },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
};
