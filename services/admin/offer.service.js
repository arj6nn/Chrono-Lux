import Offer from "../../models/offer.model.js";

/* ======================
   GET ALL OFFERS
====================== */
export const getAllOffers = async (page = 1, limit = 4) => {
  const skip = (page - 1) * limit;

  const [offers, totalOffers] = await Promise.all([
    Offer.find()
      .populate({
        path: "applicableProducts",
        select: "productName variants brand category",
        populate: [
          { path: "brand", select: "brandName" },
          { path: "category", select: "name" }
        ]
      })
      .populate("applicableCategory", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Offer.countDocuments()
  ]);

  return { offers, totalOffers };
};

/* ======================
   CREATE OFFER
====================== */
export const createNewOffer = async (offerData) => {
  const {
    type,
    discountValue,
    startDate,
    endDate,
    applicableProducts = []
  } = offerData;

  // Date validation
  if (new Date(startDate) >= new Date(endDate)) {
    throw new Error("Start date must be before end date");
  }

  // Discount validation
  if (discountValue < 1 || discountValue > 100) {
    throw new Error("Discount must be between 1 and 100");
  }

  // Product offer validation
  if (type === "PRODUCT" && (!applicableProducts || applicableProducts.length === 0)) {
    throw new Error("Product offer must have at least one product");
  }

  // Category offer validation
  if (type === "CATEGORY" && !offerData.applicableCategory) {
    throw new Error("Category offer must have a selected category");
  }

  return await Offer.create(offerData);
};

/* ======================
   UPDATE OFFER
====================== */
export const updateOfferById = async (offerId, updateData) => {
  const {
    type,
    discountValue,
    startDate,
    endDate,
    applicableProducts = []
  } = updateData;

  // Date validation
  if (new Date(startDate) >= new Date(endDate)) {
    throw new Error("Start date must be before end date");
  }

  // Discount validation
  if (discountValue < 1 || discountValue > 100) {
    throw new Error("Discount must be between 1 and 100");
  }

  // Product offer validation
  if (type === "PRODUCT" && (!applicableProducts || applicableProducts.length === 0)) {
    throw new Error("Product offer must have at least one product");
  }

  // Category offer validation
  if (type === "CATEGORY" && !updateData.applicableCategory) {
    throw new Error("Category offer must have a selected category");
  }

  const offer = await Offer.findByIdAndUpdate(
    offerId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!offer) {
    throw new Error("Offer not found");
  }

  return offer;
};

/* ======================
   TOGGLE STATUS
====================== */
export const toggleOfferStatusById = async (offerId) => {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new Error("Offer not found");
  }

  offer.isActive = !offer.isActive;
  return await offer.save();
};

/* ======================
   GET OFFER STATS
====================== */
export const getOfferStats = async () => {
  const now = new Date();

  const [totalOffers, activeOffers, productOffers, categoryOffers] = await Promise.all([
    Offer.countDocuments(),
    Offer.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }),
    Offer.countDocuments({ type: "PRODUCT" }),
    Offer.countDocuments({ type: "CATEGORY" })
  ]);

  return {
    total: totalOffers,
    active: activeOffers,
    productOffers: productOffers,
    categoryOffers: categoryOffers
  };
};
