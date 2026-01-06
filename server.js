import express from 'express'
import connectDb from './config/db.js';
import dotenv from 'dotenv'
import cors from 'cors'
import UserRoute from './Route/Userroute.js';

dotenv.config()



const app = express()
connectDb()

app.use(express.json())
app.use(cors());
console.log("Server Started!");


app.use("/",UserRoute);


app.listen(3000,()=> console.log("server Started http://localhost:3000")
)
