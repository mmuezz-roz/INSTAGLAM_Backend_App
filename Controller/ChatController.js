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
      participants: { $all: [myId, userId] }
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
  try {
    const convos = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username profilePic followers following")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.json(convos);
  } catch (err) {
    console.error("❌ GET_CONVERSATIONS ERROR:", err);
    res.status(500).json({ message: "Failed to load conversations" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const messages = await Message.find({
      conversation: conversationId,
    }).sort({ createdAt: 1 });

    console.log(`📡 Found ${messages.length} messages for convo ${conversationId}`);
    res.json(messages);
  } catch (err) {
    console.error("❌ GET_MESSAGES ERROR:", err);
    res.status(500).json({ message: "Failed to load messages" });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("❌ GET_UNREAD_COUNTS ERROR:", err);
    res.json([]);
  }
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

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    const conversationId = message.conversation;
    await Message.findByIdAndDelete(messageId);

    // If it was the last message, update the conversation
    const lastMsg = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: lastMsg ? lastMsg._id : null,
      updatedAt: Date.now()
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE_MESSAGE ERROR:", err);
    res.status(500).json({ message: "Failed to delete message" });
  }
};
