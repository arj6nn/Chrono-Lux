import nodemailer from "nodemailer";

export const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
};
