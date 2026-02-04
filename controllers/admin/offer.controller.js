import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";

import {
  getAllOffers,
  createNewOffer,
  updateOfferById,
  toggleOfferStatusById,
  getOfferStats
} from "../../services/admin/offer.service.js";


//   LOAD OFFER PAGE
export const loadOfferPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    const { offers, totalOffers } = await getAllOffers(page, limit);
    const totalPages = Math.ceil(totalOffers / limit);
    const stats = await getOfferStats();

    const categories = await Category.find({ isListed: true, isBlocked: false }).select("_id name");

    res.render("admins/offer", {
      offers,
      categories,
      stats,
      currentPage: page,
      totalPages,
      limit,
      activePage: "offers"
    });
  } catch (err) {
    console.error("Error loading offer page:", err);
    res.status(500).send("Failed to load offers");
  }
};


//   CREATE OFFER
export const createOffer = async (req, res) => {
  try {
    // Parse selected product IDs (sent as JSON string)
    const applicableProducts = req.body.applicableProducts
      ? JSON.parse(req.body.applicableProducts)
      : [];

    const offerData = {
      name: req.body.name,
      type: req.body.type, // PRODUCT | CATEGORY
      discountType: "PERCENTAGE",
      discountValue: Number(req.body.discountValue),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      isActive: req.body.isActive === "on",
      applicableProducts,
      applicableCategory: req.body.applicableCategory || null
    };

    await createNewOffer(offerData);
    res.redirect("/admin/offers");
  } catch (err) {
    console.error("Create offer error:", err);
    res.status(400).send(err.message);
  }
};


//   UPDATE OFFER
export const updateOffer = async (req, res) => {
  try {
    const applicableProducts = req.body.applicableProducts
      ? JSON.parse(req.body.applicableProducts)
      : [];

    const updateData = {
      name: req.body.name,
      type: req.body.type,
      discountValue: Number(req.body.discountValue),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      isActive: req.body.isActive === "on",
      applicableProducts,
      applicableCategory: req.body.applicableCategory || null
    };

    await updateOfferById(req.params.id, updateData);
    res.redirect("/admin/offers");
  } catch (err) {
    console.error("Update offer error:", err);
    res.status(400).send(err.message);
  }
};


//   TOGGLE STATUS
export const toggleOfferStatus = async (req, res) => {
  try {
    const updatedOffer = await toggleOfferStatusById(req.params.id);
    res.json({ success: true, isActive: updatedOffer.isActive });
  } catch (err) {
    console.error("Toggle offer error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};
