import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
  // ESM Hoisting fix: variables must be read inside the function
  const clean = (val) => val ? val.trim().replace(/["']/g, "") : "";

  const user = clean(process.env.EMAIL_USER);
  const pass = clean(process.env.EMAIL_PASS);

  console.log("Attempting to send email to:", email);
  console.log("Using EMAIL_USER:", user ? "Defined (Masked)" : "UNDEFINED");
  console.log("Using EMAIL_PASS:", pass ? "Defined (Masked)" : "UNDEFINED");

  if (!user || !pass) {
    throw new Error("SERVER ERROR: EMAIL_USER or EMAIL_PASS environment variables are missing on Render dashboard.");
  }

  // More robust Gmail configuration for cloud environments
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Sway Support" <${user}>`,
    to: email,
    subject: "SWAY Registration OTP",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; text-align: center;">Welcome to Sway</h2>
        <p>Your One-Time Password (OTP) for registration is:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">© 2026 SWAY</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    return info;
  } catch (error) {
    console.error("Nodemailer Error:", error.message);
    throw new Error(`Email Service Error: ${error.message}`);
  }
};
