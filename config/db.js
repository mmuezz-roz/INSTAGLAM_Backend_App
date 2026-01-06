import mongoose from "mongoose";

export default async function connectDb(){
    try {
        await mongoose.connect(process.env.MONGO_atles_Uri)
        console.log("MongoDbAtles Is Connected..");
        
        
    } catch (error) {
        console.log("ATLESDb Is not Connected",error);
        
    }
}