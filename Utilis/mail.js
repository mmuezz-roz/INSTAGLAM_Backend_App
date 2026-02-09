import nodemailer from "nodemailer";

export const sendOtpEmail = async (email, otp) => {
  // Function-level cleaning to handle potential ESM hoisting issues 
  // and stripping quotes/spaces from env variables (common on Render/Vercel)
  const clean = (val) => val ? val.replace(/[\s"']/g, "") : "";

  const user = clean(process.env.EMAIL_USER);
  const pass = clean(process.env.EMAIL_PASS);

  if (!user || !pass) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS environment variables");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"Sway" <${user}>`,
    to: email,
    subject: "SWAY Registration OTP",
    html: `
      <div style="font-family: 'Fredoka', sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #000; text-align: center;">Welcome to Sway</h2>
        <p>Thank you for signing up! Please use the following One-Time Password (OTP) to verify your account:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center;">© 2026 SWAY FROM META</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};
