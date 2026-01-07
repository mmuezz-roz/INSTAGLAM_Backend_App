import express from 'express'
import { googleAuth, registerUser, userLogin } from '../Controller/userController.js';
import Verifytoken from '../Middleware/Verifytoken.js';
import { editProfile } from '../Controller/EditProfileController.js';
import upload from '../Middleware/Multer.js';

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



export default UserRoute