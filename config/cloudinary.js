
import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv'



dotenv.config();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_URL,
    api_key:process.env.Cloudinary_API_key,
    
    api_secret:process.env.CLOUDINARY_API_SECRET,
    secure:true
})

export const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "songs",
      },
      (error, result) => {
        if (error) {
          console.log("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    stream.end(fileBuffer); 
  });
};


export default cloudinary