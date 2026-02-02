import { getUserCart } from "../../services/user/cart.service.js";
import { addItemToCart } from "../../services/user/cart.service.js";
import { removeItemFromCart } from "../../services/user/cart.service.js";
import { updateCartItemQuantity } from "../../services/user/cart.service.js";

/*==== LOAD CART ====*/

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.redirect("/login");
    }

    const result = await getUserCart(userId);

    // Handle null cart
    if (!result) {
      return res.render("users/cart", {
        cart: null,
        reducedItems: [],
        removedItems: []
      });
    }

    const { cart, reducedItems, removedItems } = result;

    res.render("users/cart", { cart, reducedItems, removedItems });

  } catch (error) {
    console.error("LOAD CART ERROR:", error);
    res.redirect("/pageerror");
  }
};

/* ==== ADD TO CART ==== */

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user?.id;

    const result = await addItemToCart({
      userId,
      productId: req.body.productId,
      variantId: req.body.variantId,
      quantity: req.body.quantity
    });

    return res.json(result);

  } catch (error) {
    console.error("ADD TO CART ERROR:", error);
    return res.json({ success: false, message: "Something went wrong" });
  }
};

/* ==== REMOVE FROM CART ==== */

const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { itemId } = req.params;

    const result = await removeItemFromCart({ userId, itemId });

    return res.json(result);

  } catch (error) {
    console.error("REMOVE CART ITEM ERROR:", error);
    return res.json({ success: false, message: "Something went wrong" });
  }
};

/* ==== UPDATE QUANTITY ==== */

const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { itemId } = req.params;
    const { action } = req.body;

    const result = await updateCartItemQuantity({
      userId,
      itemId,
      action
    });

    return res.json(result);

  } catch (error) {
    console.error("UPDATE QTY ERROR:", error);
    return res.json({ success: false, message: "Something went wrong" });
  }
};


export default {
  loadCart,
  addToCart,
  removeFromCart,
  updateQuantity
};