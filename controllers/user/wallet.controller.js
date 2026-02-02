import User from "../../models/user.model.js";
import * as walletService from "../../services/user/wallet.service.js";
import crypto from "crypto";


// --- VIEW 1: Main Wallet Page (Balance + History) ---
const loadWalletPage = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 3;

        if (!user) {
            return res.redirect("/login");
        }

        const walletData = await walletService.getWalletDetails(userId, page, limit);

        res.render("users/user-wallet", {
            user,
            wallet: walletData,
            pageTitle: "My Wallet",
            isAddMoneyPage: false, // Explicitly set to false to show history
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            currentPage: walletData.currentPage,
            totalPages: walletData.totalPages
        });


    } catch (error) {
        console.error("Load wallet page error:", error);
        res.redirect("/profile");
    }
};

// --- VIEW 2: Add Money Page (The Grid view from your image) ---
const loadAddMoneyPage = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect("/login");
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        const walletData = await walletService.getWalletDetails(userId);

        res.render("users/user-wallet", {
            user,
            wallet: walletData,
            pageTitle: "Add Money",
            isAddMoneyPage: true, // TRIGGERS THE ADD MONEY UI
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });


    } catch (error) {
        console.error("Load add money page error:", error);
        res.redirect("/profile/wallet");
    }
};

// --- ACTION: API to actually process the credit ---
const addMoney = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Check if amount is coming from query (GET) or body (POST)
        const amount = parseFloat(req.body.amount || req.query.amount);
        const userId = req.session.user.id;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        await walletService.creditWallet(
            userId,
            amount,
            "added_funds",
            "Added money to wallet"
        );

        // If it's an AJAX request (from a button), return JSON
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: `Successfully added ₹${amount} to your wallet` });
        }

        // If it's a direct redirect, go back to the wallet history
        res.redirect("/profile/wallet");

    } catch (error) {
        console.error("Add money error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const verifyWalletPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount
        } = req.body;

        const userId = req.session.user.id;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (expectedSign === razorpay_signature) {
            // Payment verified, credit wallet
            await walletService.creditWallet(
                userId,
                amount,
                "added_funds",
                "Added money to wallet via Razorpay"
            );

            res.json({ success: true, message: "Money added to wallet successfully" });
        } else {
            console.error("Invalid signature in wallet top-up");
            res.json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Wallet verification error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export {
    loadWalletPage,
    loadAddMoneyPage,
    addMoney,
    verifyWalletPayment
};
