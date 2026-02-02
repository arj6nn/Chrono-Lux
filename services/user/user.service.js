import User from "../../models/user.model.js";
import Address from "../../models/address.model.js";
import Wallet from "../../models/wallet.model.js";
import bcrypt from 'bcrypt';
import { generateReferralCode } from "../../utils/referral.util.js";

/* ================= LOAD PROFILE ================= */

export const getUserProfileData = async (userId) => {
  if (!userId) {
    const err = new Error("UNAUTHORIZED");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const wallet = await Wallet.findOne({ userId }).lean();
  user.wallet = wallet?.balance || 0;

  const addresses = await Address.find({ user_id: userId }).lean();

  return { user, addresses };
};

/* ================= UPDATE PROFILE ================= */

export const updateUserProfile = async ({ userId, name, phone, profileImage }) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  user.name = name;
  user.phone = phone;

  if (profileImage) {
    user.profileImage = profileImage;
  }

  await user.save();
};

/* ================= UPDATE PROFILE IMAGE ================= */

export const updateUserProfileImage = async (userId, imageUrl) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  user.profileImage = imageUrl;
  await user.save();
};

export const changeUserPassword = async (
  userId,
  currentPassword,
  newPassword
) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    const err = new Error("INVALID_PASSWORD");
    err.code = "INVALID_PASSWORD";
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
};

export const getUserForEditProfile = async (userId) => {
  if (!userId) {
    const err = new Error("UNAUTHORIZED");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  return user;
};


export const getUserReferralData = async (userId) => {
  if (!userId) {
    const err = new Error("UNAUTHORIZED");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const user = await User.findById(userId).populate('redeemedUsers');
  if (!user) {
    const err = new Error("USER_NOT_FOUND");
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  // Generate referral code if it doesn't exist
  if (!user.referalCode) {
    user.referalCode = generateReferralCode();
    await user.save();
  }

  const userLean = user.toObject();

  const wallet = await Wallet.findOne({ userId }).lean();
  const walletBalance = wallet?.balance || 0;

  return { user: userLean, walletBalance };
};
