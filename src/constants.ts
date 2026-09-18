// # Constants

// Konstanta aplikasi yang sering digunakan.

export const APP_NAME = "NARIPO";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Kategori Produk
export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Sports",
  "Beauty",
  "Books",
];

// Status Order
export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

// Payment Methods
export const PAYMENT_METHODS = [
  { id: "credit_card", name: "Kartu Kredit" },
  { id: "debit_card", name: "Kartu Debit" },
  { id: "bank_transfer", name: "Transfer Bank" },
  { id: "e_wallet", name: "E-Wallet" },
];

// Pagination
export const ITEMS_PER_PAGE = 12;

// Regex Patterns
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?\d{10,}$/,
  INDONESIAN_PHONE: /^(\+62|0)[0-9]{9,12}$/,
  PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};
