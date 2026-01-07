import express from 'express'
import connectDb from './config/db.js';
import dotenv from 'dotenv'
import cors from 'cors'
import UserRoute from './Route/Userroute.js';

dotenv.config()



const app = express()
connectDb()

app.use(cors());
app.use(express.json({ limit: "10mb" }))
console.log("Server Started!");


app.use("/user",UserRoute);


app.listen(3000,()=> console.log("server Started http://localhost:3000")
)
