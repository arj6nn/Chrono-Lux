import {
  findUserByEmail,
  createUser,
  hashPassword,
  comparePassword,
  findLoginUser
} from "../../services/user/auth.service.js";

import { generateOtp } from "../../utils/otp.util.js";
import { sendVerificationEmail } from "../../utils/mail.util.js";

/* ================= SIGNUP ================= */

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword, referralCode } = req.body;

    if (password !== cPassword) {
      return res.render("users/signup", {
        message: "Passwords do not match",
        formData: req.body
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.render("users/signup", {
        message: "User already exists with this email",
        formData: req.body
      });
    }

    const otp = generateOtp();

    console.log("Generated OTP:", otp);

    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.render("users/signup", {
        message: "Failed to send OTP",
        formData: req.body
      });
    }

    req.session.userOtp = otp;
    req.session.otpGeneratedAt = Date.now();
    req.session.userData = { name, phone, email, password, referralCode };

    return res.render("users/verify-otp");

  } catch (error) {
    console.error("Signup error:", error);
    res.redirect("/users/page-404");
  }
};

/* ================= VERIFY OTP ================= */

export const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.otpGeneratedAt) {
      return res.json({ success: false, message: "OTP expired" });
    }

    const currentTime = Date.now();
    const otpAge = (currentTime - req.session.otpGeneratedAt) / 1000;

    if (otpAge > 60) {
      delete req.session.userOtp;
      delete req.session.otpGeneratedAt;
      return res.json({ success: false, message: "OTP expired" });
    }

    if (otp !== req.session.userOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const userData = req.session.userData;
    const hashedPassword = await hashPassword(userData.password);

    await createUser({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: hashedPassword,
      referredByCode: userData.referralCode // We'll assume this field for storing who referred them
    });

    delete req.session.userOtp;
    delete req.session.otpGeneratedAt;
    delete req.session.userData;

    return res.json({ success: true, redirectUrl: "/login" });

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false });
  }
};

/* ================= RESEND OTP ================= */

export const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData?.email) {
      return res.json({ success: false, message: "Session expired" });
    }

    const otp = generateOtp();

    console.log("Resend OTP:", otp);

    req.session.userOtp = otp;
    req.session.otpGeneratedAt = Date.now();

    const emailSent = await sendVerificationEmail(req.session.userData.email, otp);

    if (!emailSent) {
      return res.json({ success: false, message: "OTP resend failed" });
    }

    return res.json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.error("Resend OTP error:", error);
    res.json({ success: false });
  }
};

/* ================= EXPIRE OTP ================= */

export const expireOtp = async (req, res) => {
  try {
    delete req.session.userOtp;
    delete req.session.otpGeneratedAt;
    res.json({ success: true, message: "OTP expired successfully" });
  } catch (error) {
    console.error("Expire OTP error:", error);
    res.json({ success: false });
  }
};

/* ================= LOGIN ================= */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findLoginUser(email);

    if (!user) {
      return res.render("users/login", { message: "User not found", blocked: false });
    }

    if (user.isBlocked) {
      return res.render("users/login", { blocked: true, message: null });
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.render("users/login", { message: "Incorrect password", blocked: false });
    }

    req.session.user = { id: user._id.toString() };
    req.session.loginSuccess = true;

    return res.redirect("/home");

  } catch (error) {
    console.error("Login error:", error);
    res.render("users/login", {
      message: "Login failed",
      blocked: false
    });
  }
};

/* ================= LOGOUT ================= */

export const logout = (req, res) => {
  delete req.session.user;
  return res.redirect("/login");
};
