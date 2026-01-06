import express from 'express'
import { googleAuth, registerUser, userLogin } from '../Controller/userController.js';

const UserRoute = express.Router()
UserRoute.use((Req,res,next)=>{
    console.log("Router Level Middleware");
    next()
})

UserRoute.post("/register",registerUser)
UserRoute.post("/login",userLogin)
UserRoute.post("/googlelog",googleAuth)

export default UserRoute