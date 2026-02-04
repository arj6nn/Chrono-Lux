import Offer from "../models/offer.model.js";

/**
 * Applies the best available offer (Product or Category) to a list of products.
 * Returns products with updated salesPrice based on the maximum discount value.
 */
export const applyOffers = async (products) => {
    if (!products) return products;

    const isSingle = !Array.isArray(products);
    let productList = isSingle ? [products] : products;

    // Convert Mongoose documents to plain objects for easier manipulation
    productList = productList.map(p => (p.toObject ? p.toObject() : p));

    const now = new Date();
    const activeOffers = await Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    if (activeOffers.length === 0) return isSingle ? productList[0] : productList;

    productList.forEach(product => {
        const productId = product._id?.toString();
        const categoryId = (product.category?._id || product.category)?.toString();

        // 1. Find all applicable offers
        const applicableOffers = activeOffers.filter(offer => {
            if (offer.type === "PRODUCT") {
                return offer.applicableProducts.some(id => id.toString() === productId);
            } else if (offer.type === "CATEGORY") {
                return offer.applicableCategory?.toString() === categoryId;
            }
            return false;
        });

        if (applicableOffers.length > 0) {
            // 2. Find the offer with the highest discount value
            const bestOffer = applicableOffers.reduce((max, curr) =>
                curr.discountValue > max.discountValue ? curr : max
            );

            // 3. Update each variant's salesPrice
            if (product.variants && Array.isArray(product.variants)) {
                product.variants.forEach(variant => {
                    // Safety check: ensure variant exists and has a price
                    if (!variant || typeof variant.price !== 'number') return;

                    const originalPrice = variant.price;
                    const discountAmount = Math.floor((originalPrice * bestOffer.discountValue) / 100);
                    variant.salesPrice = originalPrice - discountAmount;

                    // Attach offer metadata for UI display
                    variant.appliedOffer = {
                        name: bestOffer.name,
                        discountValue: bestOffer.discountValue,
                        type: bestOffer.type
                    };
                });
            }
        } else {
            // Optional: Reset salesPrice to MRP if no offers are active
            // product.variants?.forEach(v => v.salesPrice = v.price);
        }
    });

    return isSingle ? productList[0] : productList;
};
