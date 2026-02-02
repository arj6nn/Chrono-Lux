import User from "../../models/user.model.js";
import bcrypt from "bcrypt";
import { generateReferralCode } from "../../utils/referral.util.js";
import { creditWallet, getOrCreateWallet } from "./wallet.service.js";

/* ================= PASSWORD ================= */

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/* ================= USER ================= */

export const findUserByEmail = async (email) => {
  return await User.findOne({ email });
};


export const createUser = async (userData) => {
  const referalCode = generateReferralCode();
  const user = new User({ ...userData, referalCode });
  const savedUser = await user.save();

  try {
    if (userData.referredByCode) {
      const referrer = await User.findOne({ referalCode: userData.referredByCode });
      if (referrer) {
        // Credit referrer ₹150
        await creditWallet(
          referrer._id,
          150,
          'referral_bonus',
          `Referral bonus for inviting ${savedUser.name}`
        );

        // Add new user to referrer's referral list
        referrer.redeemedUsers.push(savedUser._id);
        await referrer.save();

        // Credit new user ₹100
        await creditWallet(
          savedUser._id,
          100,
          'referral_bonus',
          'Welcome bonus for using a referral code'
        );
      } else {
        // Create empty wallet if refer code invalid
        await getOrCreateWallet(savedUser._id);
      }
    } else {
      // Create empty wallet for normal signup
      await getOrCreateWallet(savedUser._id);
    }
  } catch (walletError) {
    console.error("Referral wallet credit error:", walletError);
    // We don't want to fail signup if wallet credit fails, but it should ideally be atomical
    // For now, logging the error is better than breaking signup
  }

  return savedUser;
};

export const findLoginUser = async (email) => {
  return await User.findOne({ isAdmin: 0, email });
};