import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // OTP expires in 10 minutes
    },
});

const OtpModel = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
export default OtpModel;
