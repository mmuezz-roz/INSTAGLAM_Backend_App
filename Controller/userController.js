import { UserModel } from "../Models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

//  ================= REGISTER ================= 
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    
    const hashed = await bcrypt.hash(password, 10);


    const newUser = await UserModel.create({
      username,
      email,
      password: hashed,
    });

    
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Successfully registered!",
      token,
      user: newUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ================= LOGIN ================= 
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

  
    const loginedUser = await UserModel.findOne({ email });
    if (!loginedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Block Google-only users
    if (!loginedUser.password) {
      return res.status(401).json({
        message: "This account uses Google login",
      });
    }

    
    const match = await bcrypt.compare(password, loginedUser.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }

  
    const token = jwt.sign(
      { id: loginedUser._id, email: loginedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful!",
      token,
      user: loginedUser,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
};




export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    
    let user = await UserModel.findOne({ email });

    
    if (!user) {
      user = await UserModel.create({
        username: name.replace(/\s/g, "").toLowerCase(),
        email,
        googleId: sub,
        profilePic: picture,
      });
    }

   
    const jwtToken = generateToken(user._id);

    res.status(200).json({
      token: jwtToken,
      user,
    });

  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Google authentication failed" });
  }
}; 

