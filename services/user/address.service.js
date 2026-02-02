import Address from "../../models/address.model.js";

const getUserAddresses = async (userId) => {
  try {
    return await Address.find({ user_id: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
  } catch (error) {
    throw new Error("Failed to fetch addresses");
  }
};

/**
 * Add a new address for a user
 * @param {String} userId
 * @param {Object} addressData
 */
const addUserAddress = async (userId, addressData) => {
  const {
    name,
    addressType,
    line1,
    line2,
    city,
    state,
    pin_code,
    phone,
    isDefault
  } = addressData;

  try {
    // If new address is default, unset old default
    if (isDefault) {
      await Address.updateMany(
        { user_id: userId },
        { $set: { isDefault: false } }
      );
    }

    // Create new address
    return await Address.create({
      user_id: userId,
      name,
      addressType,
      line1,
      line2,
      city,
      state,
      pin_code,
      phone,
      isDefault: Boolean(isDefault)
    });
  } catch (error) {
    throw new Error("Failed to add address");
  }
};

/**
 * Update a user's address
 * @param {String} userId
 * @param {String} addressId
 * @param {Object} body
 */
const updateUserAddress = async (userId, addressId, body) => {
  const allowedFields = [
    "name",
    "addressType",
    "line1",
    "line2",
    "city",
    "state",
    "pin_code",
    "phone",
    "isDefault"
  ];

  const updates = {};

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] =
        field === "pin_code" || field === "phone"
          ? Number(body[field])
          : body[field];
    }
  });

  // Handle default address
  if (updates.isDefault === true || updates.isDefault === "true") {
    await Address.updateMany(
      { user_id: userId },
      { $set: { isDefault: false } }
    );
    updates.isDefault = true;
  }

  return await Address.updateOne(
    { _id: addressId, user_id: userId },
    { $set: updates }
  );
};

/**
 * Delete a user's address
 * If default address is deleted, assign another address as default
 * @param {String} userId
 * @param {String} addressId
 */
const deleteUserAddress = async (userId, addressId) => {
  // Check ownership
  const address = await Address.findOne({
    _id: addressId,
    user_id: userId
  });

  if (!address) {
    const error = new Error("Address not found");
    error.statusCode = 404;
    throw error;
  }

  // If deleting default address, assign another as default
  if (address.isDefault) {
    const anotherAddress = await Address.findOne({
      user_id: userId,
      _id: { $ne: addressId }
    });

    if (anotherAddress) {
      await Address.updateOne(
        { _id: anotherAddress._id },
        { $set: { isDefault: true } }
      );
    }
  }

  await Address.deleteOne({ _id: addressId, user_id: userId });

  return true;
};

export default {
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress
};
