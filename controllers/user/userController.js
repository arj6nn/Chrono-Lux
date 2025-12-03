// const User = require("../../models/userSchema");
// const nodemailer = require("nodemailer");
// const env = require("dotenv").config();
// const bcrypt = require("bcrypt");

// // 404 PAGE
// const pageNotFound = async (req, res) => {
//     try {
//         res.render("page-404");
//     } catch (error) {
//         res.redirect("pageNotFound");
//     }
// };

// // LANDING PAGE
// const loadLandingPage = async (req, res) => {
//     try {
//         return res.render("landing");
//     } catch (error) {
//         console.log("landing page not found");
//         res.status(500).send("Server error");
//     }
// };

// //HOME PAGE
// const loadHomePage = async (req,res) => {
//     try {
//         const user = req.session.user;
//         if(user){
//             const userData = await User.findOne({_id : user._id })
//             res.render("home", { user : userData})
//         }else{
//             return res.render("home")
//         }
//     } catch (error) {
//         console.log("home page not found")
//         res.status(500).send("Server error")
//     }
// }

// // SIGNUP PAGE
// const loadSignup = async (req, res) => {
//     try {
//         return res.render("signup",{message:null});
//     } catch (error) {
//         res.status(500).send("Server error");
//     }
// };

// // LOGIN PAGE
// const loadLogin = async (req, res) => {
//     try {
//         if(!req.session.user){
//             return res.render("login",{message:null})
//         }else{
//             res.redirect("/home")
//         }
//     } catch (error) {
//         res.redirect("/pageNotFound")
//     }
// };

// // SHOP PAGE
// const loadShopping = async (req, res) => {
//     try {
//         return res.render("shop");
//     } catch (error) {
//         res.status(500).send("Server error");
//     }
// };

// // OTP GENERATOR
// function generateOtp() {
//     return Math.floor(100000 + Math.random() * 900000).toString();
// }

// // SEND MAIL FUNCTION
// async function sendVerificationEmail(email, otp) {
//     try {
//         const transporter = nodemailer.createTransport({
//             service: "gmail",
//             port: 587,
//             secure: false,
//             requireTLS: true,
//             auth: {
//                 user: process.env.NODEMAILER_EMAIL,
//                 pass: process.env.NODEMAILER_PASSWORD,
//             },
//         });

//         const info = await transporter.sendMail({
//             from: process.env.NODEMAILER_EMAIL,
//             to: email,
//             subject: "Verify your account",
//             text: `Your OTP is ${otp}`,
//             html: `<b>Your OTP: ${otp}</b>`,
//         });

//         return info.accepted.length > 0;
//     } catch (error) {
//         console.error("Error sending email", error);
//         return false;
//     }
// }

// // SIGNUP (SEND OTP)
// const signup = async (req, res) => {
//     try {
//         const { name, phone, email, password, cPassword } = req.body;

//         if (password !== cPassword) {
//             return res.render("signup", { message: "Passwords do not match" });
//         }

//         const findUser = await User.findOne({ email });
//         if (findUser) {
//             return res.render("signup", { message: "User already exists with this email" });
//         }

//         const otp = generateOtp();
//         const emailSent = await sendVerificationEmail(email, otp);

//         if (!emailSent) {
//             return res.json("email-error");
//         }

//         // Save OTP & user data in session
//         req.session.userOtp = otp;
//         req.session.userData = { name, phone, email, password };

//         console.log("OTP sent:", otp);

//         res.render("verify-otp");
//     } catch (error) {
//         console.error("Signup error", error);
//         res.redirect("/pageNotFound");
//     }
// };

// // PASSWORD HASH FUNCTION
// const securePassword = async (password) => {
//     try {
//         const passwordHash = await bcrypt.hash(password, 10);
//         return passwordHash;
//     } catch (error) {
//         throw new Error("Password hashing failed");
//     }
// };

// // VERIFY OTP
// const verifyOtp = async (req, res) => {
//     try {
//         const { otp } = req.body;

//         console.log("Entered OTP:", otp);
//         console.log("Stored OTP:", req.session.userOtp);

//         if (!req.session.userOtp) {
//             return res.json({
//                 success: false,
//                 message: "OTP expired. Please request a new one.",
//             });
//         }

//         if (otp !== req.session.userOtp.toString()) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid OTP. Please try again",
//             });
//         }

//         // OTP MATCHED
//         const user = req.session.userData;

//         const passwordHash = await securePassword(user.password);

//         const saveUserData = new User({
//             name: user.name,
//             email: user.email,
//             phone: user.phone,
//             password: passwordHash,
//         });

//         await saveUserData.save();

//         // Clear sensitive session data
//         delete req.session.userOtp;
//         delete req.session.userData;

//         req.session.user = saveUserData._id;

//         return res.json({
//             success: true,
//             redirectUrl: "/home",
//         });
//     } catch (error) {
//         console.error("Error verifying OTP", error);
//         res.status(500).json({
//             success: false,
//             message: "An error occurred while verifying OTP",
//         });
//     }
// };

// //Resend OTP
// const resendOtp = async (req, res) => {
//     try {
//         if (!req.session.userData || !req.session.userData.email) {
//             return res.json({
//                 success: false,
//                 message: "Session expired. Please signup again."
//             });
//         }

//         // Generate new OTP
//         const newOtp = generateOtp();
//         req.session.userOtp = newOtp;

//         // Send email again
//         const emailSent = await sendVerificationEmail(req.session.userData.email, newOtp);

//         if (!emailSent) {
//             return res.json({
//                 success: false,
//                 message: "Failed to resend OTP. Try again."
//             });
//         }

//         console.log("New OTP Sent:", newOtp);

//         return res.json({
//             success: true,
//             message: "New OTP sent successfully!"
//         });

//     } catch (error) {
//         console.log("Resend OTP error:", error);
//         return res.json({
//             success: false,
//             message: "Something went wrong"
//         });
//     }
// };

// const login = async (req,res) => {
//     try {
//         const { email,password } = req.body;
//         const findUser = await User.findOne({ isAdmin:0,email:email })

//         if(!findUser){
//             return res.render("login", {message:"User not found"})
//         }
//         if(findUser.isBlocked){
//             return res.render("login",{message:"User is blocked by admin"})
//         }

//         const passwordMatch = await bcrypt.compare(password,findUser.password)

//         if(!passwordMatch){
//             return res.render("login",{ message:"Incorrect password" })
//         }

//         req.session.user = findUser._id
//         res.redirect("/home")
//     } catch (error) {
//         console.error("Login error",error)
//         res.render("login",{message:"Login failed, Please try again later"})
//     }
// }


// module.exports = {
//     loadLandingPage,
//     loadHomePage,
//     pageNotFound,
//     loadShopping,
//     loadSignup,
//     loadLogin,
//     signup,
//     verifyOtp,
//     resendOtp,
//     login
// };

const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

// 404 PAGE
const pageNotFound = async (req, res) => {
    try {
        res.render("users/page-404");
    } catch (error) {
        res.redirect("users/page-404");
    }
};

// LANDING PAGE
const loadLandingPage = async (req, res) => {
    try {
        return res.render("users/landing");
    } catch (error) {
        console.log("landing page not found");
        res.status(500).send("Server error");
    }
};

// HOME PAGE
const loadHomePage = async (req, res) => {
    try {
        return res.render("users/home");
    } catch (error) {
        console.log("home page not found");
        res.status(500).send("Server error");
    }
};

// SIGNUP PAGE
const loadSignup = async (req, res) => {
    try {
        return res.render("users/signup", { message: null });
    } catch (error) {
        res.status(500).send("Server error");
    }
};

// LOGIN PAGE
const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("users/login", { message: null,blocked: false });
        } else {
            return res.redirect("/home");
        }
    } catch (error) {
        res.redirect("/users/page-404");
    }
};

// SHOP PAGE
const loadShopping = async (req, res) => {
    try {
        return res.render("users/shop");
    } catch (error) {
        res.status(500).send("Server error");
    }
};

// OTP GENERATOR
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// SEND MAIL FUNCTION
async function sendVerificationEmail(email, otp) {
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
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

// SIGNUP (SEND OTP)
const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cPassword } = req.body;

        if (password !== cPassword) {
            return res.render("users/signup", { message: "Passwords do not match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("users/signup", { message: "User already exists with this email" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json("email-error");
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        console.log("OTP sent:", otp);

        return res.render("users/verify-otp");
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/users/page-404");
    }
};

// HASH PASSWORD
const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch {
        throw new Error("Password hashing failed");
    }
};

// VERIFY OTP
const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.userOtp) {
            return res.json({
                success: false,
                message: "OTP expired. Please request a new one.",
            });
        }

        if (otp !== req.session.userOtp.toString()) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again",
            });
        }

        const user = req.session.userData;
        const passwordHash = await securePassword(user.password);

        const saveUserData = new User({
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: passwordHash,
        });

        await saveUserData.save();

        delete req.session.userOtp;
        delete req.session.userData;

        req.session.user = saveUserData._id;

        return res.json({
            success: true,
            redirectUrl: "/home",
        });
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while verifying OTP",
        });
    }
};

// RESEND OTP
const resendOtp = async (req, res) => {
    try {
        if (!req.session.userData || !req.session.userData.email) {
            return res.json({
                success: false,
                message: "Session expired. Please signup again.",
            });
        }

        const newOtp = generateOtp();
        req.session.userOtp = newOtp;

        const emailSent = await sendVerificationEmail(req.session.userData.email, newOtp);

        if (!emailSent) {
            return res.json({
                success: false,
                message: "Failed to resend OTP. Try again.",
            });
        }

        console.log("New OTP Sent:", newOtp);

        return res.json({
            success: true,
            message: "New OTP sent successfully!",
        });
    } catch (error) {
        console.log("Resend OTP error:", error);
        return res.json({
            success: false,
            message: "Something went wrong",
        });
    }
};

// LOGIN
// const login = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         const findUser = await User.findOne({ isAdmin: 0, email });

//         if (!findUser) {
//             return res.render("users/login", { message: "User not found" });
//         }

//         if (findUser.isBlocked) {
//             // return res.render("users/login", { message: "User is blocked by admin" });
//             return res.render("users/login", { blocked: true, message: null })
//         }

//         const passwordMatch = await bcrypt.compare(password, findUser.password);

//         if (!passwordMatch) {
//             return res.render("users/login", { message: "Incorrect password" });
//         }

//         req.session.user = findUser._id;
//         return res.redirect("/home");
//     } catch (error) {
//         console.error("Login error", error);
//         return res.render("users/login", {
//             message: "Login failed, Please try again later",
//         });
//     }
// };

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email });

        if (!findUser) {
            return res.render("users/login", { message: "User not found", blocked: false });
        }

        if (findUser.isBlocked) {
            return res.render("users/login", { blocked: true, message: null });
        }

        if (!findUser.password) {
            return res.render("users/login", { 
                message: "Account error: missing password. Please reset password.", 
                blocked: false 
            });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.render("users/login", { message: "Incorrect password", blocked: false });
        }

        req.session.user = findUser._id;
        return res.redirect("/home");

    } catch (error) {
        console.error("Login error", error);
        return res.render("users/login", {
            message: "Login failed, Please try again later",
            blocked: false
        });
    }
};

const logout = async (req,res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log("Logout Error",err);
                return res.redirect("/home");
            }
            res.clearCookie("connect.sid");
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("logout Error",error)
        res.redirect("/home")
    }
}

module.exports = {
    loadLandingPage,
    loadHomePage,
    pageNotFound,
    loadShopping,
    loadSignup,
    loadLogin,
    signup,
    verifyOtp,
    resendOtp,
    login,
    logout
};
