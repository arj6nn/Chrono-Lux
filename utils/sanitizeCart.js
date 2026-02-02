// utils/sanitizeCart.js
export default async function sanitizeCart(cart, Product) {
  let changed = false;
  let reducedItems = [];
  let removedItems = [];

  const validItems = [];

  for (const item of cart.items) {
    // Handle both populated and unpopulated productId
    let product = item.productId;
    if (!product || !product.productName) {
      product = await Product.findById(item.productId);
    }

    if (!product || product.isBlocked) {
      changed = true;
      removedItems.push(product ? product.productName : "Unknown Product");
      continue;
    }

    const variant = product.variants.id(item.variantId);
    if (!variant || variant.stock <= 0) {
      changed = true;
      removedItems.push(product.productName);
      continue;
    }

    if (item.quantity > variant.stock) {
      item.quantity = variant.stock;
      changed = true;
      reducedItems.push({ name: product.productName, quantity: variant.stock });
    }

    validItems.push(item);
  }

  if (changed) {
    cart.items = validItems;
    await cart.save();
  }
  return { cart, reducedItems, removedItems };
};


