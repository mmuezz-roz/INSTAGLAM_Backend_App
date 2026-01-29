import express from 'express'
import { acceptFollowRequest, followUnfollowUser, getFollowRequests, getMyProfile, getUserProfile, googleAuth, registerUser, rejectFollowRequest, searchUsers, userLogin, getFollowers, getFollowing } from '../Controller/userController.js';
import Verifytoken from '../Middleware/Verifytoken.js';
import { editProfile } from '../Controller/EditProfileController.js';
import upload from '../Middleware/multer.js';
import { getNotifications, getUnreadCount, markNotificationsRead } from '../Controller/NotificationController.js';

const UserRoute = express.Router()

UserRoute.post("/register", registerUser)
UserRoute.post("/login", userLogin)
UserRoute.post("/googlelog", googleAuth)


UserRoute.put(
  "/edit-profile",
  Verifytoken,
  upload.single("profilePic"),
  editProfile
);

UserRoute.get("/me", Verifytoken, getMyProfile);
UserRoute.get("/search/users", Verifytoken, searchUsers);

UserRoute.get("/notifications", Verifytoken, getNotifications);
UserRoute.get("/notifications/unread-count", Verifytoken, getUnreadCount);
UserRoute.patch("/notifications/read", Verifytoken, markNotificationsRead);

UserRoute.get("/follow-requests", Verifytoken, getFollowRequests);
UserRoute.post("/request/:requesterId/accept", Verifytoken, acceptFollowRequest);
UserRoute.post("/request/:requesterId/reject", Verifytoken, rejectFollowRequest);

UserRoute.get("/:id/followers", Verifytoken, getFollowers);
UserRoute.get("/:id/following", Verifytoken, getFollowing);
UserRoute.post("/:id/follow", Verifytoken, followUnfollowUser);
UserRoute.get("/:id", Verifytoken, getUserProfile);


export default UserRoute
