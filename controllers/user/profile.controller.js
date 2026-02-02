import {
  findUserByEmail,
  hashPassword
} from "../../services/user/auth.service.js";

import { generateOtp, verifyOtp } from "../../services/user/otp.service.js";
import { sendVerificationEmail } from "../../services/user/mail.service.js";
import User from "../../models/user.model.js";

/* ================= FORGOT PASSWORD ================= */

export const getForgotPassPage = async (req, res) => {
  try {
    res.render("users/forgot-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

export const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      return res.render("users/forgot-password", {
        message: "User with this email does not exist"
      });
    }

    if (user.googleId) {
      return res.render("users/forgot-password", {
        message: "This account uses Google Sign-In"
      });
    }

    const otp = generateOtp();
    console.log("Generated OTP:", otp);

    const emailSent = await sendVerificationEmail(
      email,
      otp,
      "Your OTP for password reset"
    );

    if (!emailSent) {
      console.log("Email failed - returning to forgot password page");
      return res.render("users/forgot-password", {
        message: "Failed to send OTP"
      });
    }

    req.session.userOtp = otp;
    req.session.otpGeneratedAt = Date.now();
    req.session.email = email;

    res.render("users/forgotPass-otp", {
      message: "OTP has been sent to your email",
      otp: otp // Added for debugging in page source
    });

  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

export const verifyForgotOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.otpGeneratedAt) {
      return res.json({
        success: false,
        message: "OTP expired"
      });
    }

    const currentTime = Date.now();
    const otpAge = (currentTime - req.session.otpGeneratedAt) / 1000;

    if (otpAge > 60) {
      delete req.session.userOtp;
      delete req.session.otpGeneratedAt;
      return res.json({
        success: false,
        message: "OTP expired"
      });
    }

    if (!verifyOtp(req.session.userOtp, otp)) {
      return res.json({
        success: false,
        message: "Invalid OTP"
      });
    }

    req.session.allowReset = true;

    res.json({
      success: true,
      redirectUrl: "/reset-password"
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const getResetPasswordPage = (req, res) => {
  if (!req.session.allowReset) {
    return res.redirect("/forgot-password");
  }
  res.render("users/reset-password");
};

export const updatePassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const hashedPassword = await hashPassword(password);

    await User.updateOne(
      { email: req.session.email },
      { $set: { password: hashedPassword } }
    );

    req.session.destroy();

    res.json({
      success: true,
      redirectUrl: "/login"
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

/* ================= RESEND OTP ================= */

export const resendForgotOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res.json({
        success: false,
        message: "Session expired"
      });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(
      email,
      otp,
      "Your OTP for password reset"
    );

    if (!emailSent) {
      return res.json({
        success: false,
        message: "Failed to resend OTP"
      });
    }

    req.session.userOtp = otp;
    req.session.otpGeneratedAt = Date.now();

    console.log("RESENT PASSWORD OTP: ", otp);

    res.json({
      success: true,
      message: "OTP resent successfully",
      otp: otp // Added for debugging
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

/* ================= EXPIRE FORGOT OTP ================= */

export const expireForgotOtp = async (req, res) => {
  try {
    delete req.session.userOtp;
    delete req.session.otpGeneratedAt;
    res.json({ success: true, message: "OTP expired successfully" });
  } catch (error) {
    console.error("Expire Forgot OTP error:", error);
    res.json({ success: false });
  }
};

/* ================= EMAIL CHANGE ================= */

export const sendEmailChangeOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const emailExists = await findUserByEmail(email);
    if (emailExists) {
      return res.json({
        success: false,
        message: "Email already in use"
      });
    }

    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(
      email,
      otp,
      "OTP for email change"
    );

    if (!emailSent) {
      return res.json({ success: false });
    }

    req.session.userOtp = otp;
    req.session.otpGeneratedAt = Date.now();
    req.session.emailToUpdate = email;

    console.log("EMAIL CHANGE OTP:", otp);

    res.json({ success: true });

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};

export const verifyEmailChangeOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.otpGeneratedAt) {
      return res.json({
        success: false,
        message: "OTP expired"
      });
    }

    const currentTime = Date.now();
    const otpAge = (currentTime - req.session.otpGeneratedAt) / 1000;

    if (otpAge > 60) {
      delete req.session.userOtp;
      delete req.session.otpGeneratedAt;
      return res.json({
        success: false,
        message: "OTP expired"
      });
    }

    if (!verifyOtp(req.session.userOtp, otp)) {
      return res.json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.json({ success: false });
    }

    user.email = req.session.emailToUpdate;
    await user.save();

    req.session.userOtp = null;
    req.session.emailToUpdate = null;

    res.json({
      success: true,
      message: "Email updated successfully"
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};
