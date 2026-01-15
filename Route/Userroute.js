import express from 'express'
import { acceptFollowRequest, followUnfollowUser, getFollowRequests, getMyProfile, getUserProfile, googleAuth, registerUser, rejectFollowRequest, searchUsers, userLogin } from '../Controller/userController.js';
import Verifytoken from '../Middleware/Verifytoken.js';
import { editProfile } from '../Controller/EditProfileController.js';
import upload from '../Middleware/multer.js';
import { getNotifications, getUnreadCount, markNotificationsRead } from '../Controller/NotificationController.js';

// import { editProfile } from "../Controller/EditProfileController";
// import { getNotifications, getUnreadCount, markNotificationsRead } from "../Controller/NotificationController";
// import { acceptFollowRequest, followUnfollowUser, getFollowRequests, getMyProfile, getUserProfile, googleAuth, registerUser, rejectFollowRequest, searchUsers, userLogin } from "../Controller/userController";
// import Verifytoken from "../Middleware/Verifytoken";


const UserRoute = express.Router()
UserRoute.use((Req,res,next)=>{
    console.log("Router Level Middleware");
    next()
})

UserRoute.post("/register",registerUser)
UserRoute.post("/login",userLogin)
UserRoute.post("/googlelog",googleAuth)

UserRoute.put(
  "/edit-profile",
  Verifytoken,
  upload.single("profilePic"),
  (req, res, next) => {
    console.log("MULTER FILE:", req.file);
    next();
  },
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

UserRoute.post("/:id/follow", Verifytoken, followUnfollowUser);
UserRoute.get("/:id", Verifytoken, getUserProfile);



export default UserRoute


// const UserRoute = express.Router();

// // middleware
// UserRoute.use((req, res, next) => {
//   console.log("Router Level Middleware");
//   next();
// });

// // AUTH
// UserRoute.post("/register", registerUser);
// UserRoute.post("/login", userLogin);
// UserRoute.post("/googlelog", googleAuth);

// // PROFILE
// UserRoute.put(
//   "/edit-profile",
//   Verifytoken,
//   upload.single("profilePic"),
//   editProfile
// );

// UserRoute.get("/me", Verifytoken, getMyProfile);
// UserRoute.get("/search/users", Verifytoken, searchUsers);

// // NOTIFICATIONS
// UserRoute.get("/notifications", Verifytoken, getNotifications);
// UserRoute.get("/notifications/unread-count", Verifytoken, getUnreadCount);
// UserRoute.patch("/notifications/read", Verifytoken, markNotificationsRead);

// // FOLLOW REQUESTS
// UserRoute.get("/follow-requests", Verifytoken, getFollowRequests);
// UserRoute.post("/request/:requesterId/accept", Verifytoken, acceptFollowRequest);
// UserRoute.post("/request/:requesterId/reject", Verifytoken, rejectFollowRequest);

// // FOLLOW / UNFOLLOW
// UserRoute.post("/:id/follow", Verifytoken, followUnfollowUser);

// // ⚠️ MUST BE LAST
// UserRoute.get("/:id", Verifytoken, getUserProfile);

// export default UserRoute;
