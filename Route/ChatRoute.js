import express from "express";

import { deleteMessage, getMessages, getMyConversations, getOrCreateConversation, getUnreadCounts, markAllRead, markConversationRead, searchAUsers } from "../Controller/ChatController.js";
import Verifytoken from "../Middleware/Verifytoken.js";

const chatrouter = express.Router();

// Protect all routes in this router
chatrouter.use(Verifytoken);

chatrouter.get("/conversations", getMyConversations);
chatrouter.get("/messages/:conversationId", getMessages);
chatrouter.get("/unread", getUnreadCounts);
chatrouter.post("/conversation/:userId", getOrCreateConversation);
chatrouter.get("/chatsearch/users", searchAUsers);
chatrouter.delete("/delete/:messageId", deleteMessage);
chatrouter.patch(
  "/read/:conversationId",
  markConversationRead
);

chatrouter.patch(
  "/read-all",
  markAllRead
);

export default chatrouter;
