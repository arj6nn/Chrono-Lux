const User = require("../../models/userSchema");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ✅ Correct OTP generator
function generateOtp() {
    let digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

// ✅ Correct email sender (accepts email + otp)
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            html: `<h3>Your OTP is: <b>${otp}</b></h3>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return true;

    } catch (error) {
        console.log("Email sending error:", error);
        return false;
    }
}

const getForgotPassPage = async (req, res) => {
    try {
        res.render("users/forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;

        const findUser = await User.findOne({ email: email });

        if (!findUser) {
            return res.render("users/forgot-password", {
                message: "User with this email does not exist"
            });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.render("users/forgot-password", {
                message: "Failed to send OTP. Try again."
            });
        }

        // Save OTP and email in session
        req.session.userOtp = otp;
        req.session.email = email;

        console.log("RESET OTP:", otp);

        return res.render("users/forgotPass-otp", {
            message: "OTP has been sent to your email."
        });

    } catch (error) {
        console.log(error);
        res.redirect("/pageNotFound");
    }
};

const verifyForgotOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.userOtp) {
            return res.json({
                success: false,
                message: "OTP expired. Please go back and request again."
            });
        }

        if (otp !== req.session.userOtp.toString()) {
            return res.json({
                success: false,
                message: "Invalid OTP. Try again."
            });
        }

        // OTP is correct → Allow password reset
        req.session.allowReset = true;

        return res.json({
            success: true,
            redirectUrl: "/reset-password"
        });

    } catch (error) {
        console.log(error);
        return res.json({
            success: false,
            message: "Server error. Try again."
        });
    }
};


const getResetPasswordPage = (req, res) => {
    if (!req.session.allowReset) {
        return res.redirect("/forgot-password");
    }
    res.render("users/reset-password");
};


const updatePassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.json({ success: false, message: "Passwords do not match" });
        }

        const hashed = await bcrypt.hash(password, 10);

        await User.updateOne(
            { email: req.session.email },
            { $set: { password: hashed } }
        );

        // Clear session
        req.session.allowReset = false;
        req.session.userOtp = null;
        req.session.email = null;

        return res.json({
            success: true,
            redirectUrl: "/login"
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Server error" });
    }
};


module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    verifyForgotOtp,
    getResetPasswordPage,
    updatePassword
};
