export default function (items) {
  const statuses = items.map(item => item.status);

  if (statuses.every(s => s === "Cancelled" || s === "Cancellation Requested")) {
    return statuses.includes("Cancellation Requested") ? "Cancellation Requested" : "Cancelled";
  }

  if (statuses.every(s => s === "Refunded" || s === "Cancelled" || s === "Cancellation Requested")) {
    return "Refunded"; // Or specific status
  }

  if (statuses.every(s => s === "Delivered")) {
    return "Delivered";
  }

  if (
    statuses.includes("Delivered") &&
    statuses.some(s => s === "Cancelled" || s === "Refunded")
  ) {
    return "Partially Delivered";
  }

  if (statuses.includes("Shipped")) {
    return "Shipped";
  }

  if (statuses.includes("Processing")) {
    return "Processing";
  }

  return "Pending";
};
