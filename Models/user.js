import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String 
  },

  googleId: {
    type: String 
  },

  bio: {
    type: String,
    default: ""
  },

  profilePic: {
    type: String,
    default: ""
  },

  isPrivate: {
    type: Boolean,
    default: false
  },

   followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

 followRequests: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
}],


  createdAt: {
    type: Date,
    default: Date.now
  }
});

// export const UserModel= mongoose.model("User", UserSchema);
const UserModel =
  mongoose.models.User || mongoose.model("User", UserSchema);

export default UserModel;

