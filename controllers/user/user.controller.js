import {
  getUserProfileData,
  updateUserProfile,
  updateUserProfileImage,
  changeUserPassword,
  getUserForEditProfile,
  getUserReferralData
} from "../../services/user/user.service.js";

import {
  uploadProfileImageToCloudinary
} from "../../services/user/profile-image.service.js";

import addressService from "../../services/user/address.service.js";

const loadProfile = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.redirect("/login");
    }

    const { user, addresses } =
      await getUserProfileData(req.session.user.id);

    res.render("users/user-profile", { user, addresses });

  } catch (err) {
    console.log("Profile load error:", err);
    if (err.code === "USER_NOT_FOUND") {
      return req.session.destroy(() => res.redirect("/login"));
    }
    res.redirect("/login");
  }
};

const updateProfile = async (req, res) => {
  try {
    let imageUrl;

    if (req.file) {
      imageUrl = await uploadProfileImageToCloudinary(req.file.buffer);
    }

    await updateUserProfile({
      userId: req.session.user.id,
      name: req.body.name,
      phone: req.body.phone,
      profileImage: imageUrl
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Profile update error:", error);
    res.json({ success: false, message: "Profile update failed" });
  }
};


const loadEditProfile = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.redirect("/login");
    }

    const user = await getUserForEditProfile(req.session.user.id);

    res.render("users/edit-profile", { user });

  } catch (error) {
    console.log("Edit profile load error:", error);

    if (error.code === "USER_NOT_FOUND") {
      return req.session.destroy(() => res.redirect("/login"));
    }

    res.redirect("/profile");
  }
};

const uploadProfileImage = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ success: false });
    }

    if (!req.file) {
      return res.json({ success: false, message: "No image received" });
    }

    const imageUrl =
      await uploadProfileImageToCloudinary(req.file.buffer);

    await updateUserProfileImage(req.session.user.id, imageUrl);

    res.json({ success: true });

  } catch (error) {
    console.error("Profile image upload error:", error);
    res.json({ success: false, message: "Upload failed" });
  }
};


const changePassword = async (req, res) => {
  try {
    await changeUserPassword(
      req.session.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );

    res.json({ success: true });

  } catch (err) {
    if (err.code === "INVALID_PASSWORD") {
      return res.json({ success: false, code: "INVALID_PASSWORD" });
    }

    res.status(500).json({ success: false });
  }
};


const loadAddressPage = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;

    const addresses = await addressService.getUserAddresses(userId);

    res.render("users/user-address", {
      addresses,
      active: "addresses"
    });
  } catch (error) {
    console.error("Load address error:", error);
    res.redirect("/profile");
  }
};

const addAddress = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;

    await addressService.addUserAddress(userId, req.body);

    res.json({ success: true });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({ success: false });
  }
};

const updateAddress = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const addressId = req.params.id;

    await addressService.updateUserAddress(userId, addressId, req.body);

    res.json({ success: true });
  } catch (error) {
    console.error("PATCH address error:", error);
    res.status(500).json({ success: false });
  }
};


const deleteAddress = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const addressId = req.params.id;

    await addressService.deleteUserAddress(userId, addressId);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete address error:", error);

    if (error.statusCode === 404) {
      return res
        .status(404)
        .json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false });
  }
};

const loadReferPage = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res.redirect("/login");
    }

    const { user, walletBalance } = await getUserReferralData(req.session.user.id);

    res.render("users/refer-earn", {
      user,
      walletBalance,
      active: "refer"
    });
  } catch (error) {
    console.error("Load refer page error:", error);
    res.redirect("/profile");
  }
};

export default {
  loadProfile,
  loadEditProfile,
  updateProfile,
  uploadProfileImage,
  changePassword,
  loadAddressPage,
  addAddress,
  updateAddress,
  deleteAddress,
  loadReferPage
};