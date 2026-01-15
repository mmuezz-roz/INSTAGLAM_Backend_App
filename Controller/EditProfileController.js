


import { uploadToCloudinary } from "../config/cloudinary.js";
import UserModel from "../Models/User.js";
// import UserModel from "../Models/User.js";

export const editProfile = async (req, res) => {
  try {
    const { username, bio, isPrivate } = req.body;

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    
    if (username) {
      const exists = await UserModel.findOne({
        username,
        _id: { $ne: req.user._id },
      });

      if (exists) {
        return res.status(409).json({ message: "Username already taken" });
      }
    }

    const updateData = {
      username,
      bio,
      isPrivate,
    };

    
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer);
      console.log("CLOUDINARY IMAGE URL:", imageUrl);
      updateData.profilePic = imageUrl;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("EDIT PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
