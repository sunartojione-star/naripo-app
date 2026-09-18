import { User, Product } from "@/types";
import api from "./api";

// ============ AUTH ENDPOINTS ============

export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/login", { email, password }),

  register: (email: string, password: string, name: string) =>
    api.post("/register", { email, password, name }),

  logout: () => api.post("/logout"),

  me: () => api.get("/me"),
};

// ============ PRODUCT ENDPOINTS ============

export const productAPI = {
  // Get all products (barangs)
  getAll: (params?: any) => api.get("/barangs", { params }),

  // Get product by ID
  getById: (id: string | number) => api.get(`/barangs/${id}`),

  // Get product by code (kd)
  getByCode: (code: string) =>
    api.get("/barangs/by-kd", { params: { kd: code } }),

  // Admin: Create product
  create: (data: any) => api.post("/barangs", data),

  // Admin: Update product
  update: (id: string | number, data: any) => api.put(`/barangs/${id}`, data),

  // Admin: Delete product
  delete: (id: string | number) => api.delete(`/barangs/${id}`),
};

// ============ CATEGORY ENDPOINTS (Jenis Produk) ============

export const categoryAPI = {
  // Get all categories
  getAll: (params?: any) => api.get("/jenis-produk", { params }),

  // Get category by ID
  getById: (id: string | number) => api.get(`/jenis-produk/${id}`),

  // Admin: Create category
  create: (data: any) => api.post("/jenis-produk", data),

  // Admin: Update category
  update: (id: string | number, data: any) =>
    api.put(`/jenis-produk/${id}`, data),

  // Admin: Delete category
  delete: (id: string | number) => api.delete(`/jenis-produk/${id}`),
};

// ============ CART ENDPOINTS ============

export const cartAPI = {
  // Get cart
  get: () => api.get("/cart"),

  // Add item to cart
  addItem: (productId: string | number, quantity: number) =>
    api.post("/cart/items", { product_id: productId, quantity }),

  // Update cart item
  updateItem: (productId: string | number, quantity: number) =>
    api.put("/cart/items", { product_id: productId, quantity }),

  // Remove cart item
  removeItem: (productId: string | number) =>
    api.delete("/cart/items", { params: { product_id: productId } }),

  // Sync cart (upload local cart to server)
  sync: (items: any[]) => api.put("/cart/sync", { items }),

  // Clear entire cart
  clear: () => api.delete("/cart"),
};

// ============ FAVORITES/WISHLIST ENDPOINTS ============

export const favoriteAPI = {
  // Get favorites
  get: () => api.get("/favorites"),

  // Toggle favorite
  toggle: (productId: string | number) =>
    api.post("/favorites/toggle", { product_id: productId }),

  // Sync favorites
  sync: (items: any[]) => api.put("/favorites/sync", { items }),

  // Clear all favorites
  clear: () => api.delete("/favorites"),
};

// ============ WAREHOUSE ENDPOINTS (Gudang) ============

export const warehouseAPI = {
  // Get all warehouses
  getAll: () => api.get("/gudangs"),
};

// ============ PURCHASE ORDER ENDPOINTS ============

export const purchaseOrderAPI = {
  // Get PO details
  getDetails: (id: string | number) => api.get(`/po-note/${id}/details`),

  // Abort PO
  abort: (id: string | number) => api.post(`/po-note/${id}/abort`),

  // Get all POs
  getAll: (params?: any) => api.get("/po-note", { params }),

  // Get PO by ID
  getById: (id: string | number) => api.get(`/po-note/${id}`),

  // Create PO
  create: (data: any) => api.post("/po-note", data),

  // Update PO
  update: (id: string | number, data: any) => api.put(`/po-note/${id}`, data),

  // Delete PO
  delete: (id: string | number) => api.delete(`/po-note/${id}`),
};

// ============ SALES MASTER ENDPOINTS ============

export const salesAPI = {
  // Get sales with filter
  filter: (params: any) => api.get("/master-penjualan/filter", { params }),

  // Get all sales
  getAll: (params?: any) => api.get("/master-penjualan", { params }),

  // Get sales by ID
  getById: (id: string | number) => api.get(`/master-penjualan/${id}`),

  // Create sales
  create: (data: any) => api.post("/master-penjualan", data),

  // Update sales
  update: (id: string | number, data: any) =>
    api.put(`/master-penjualan/${id}`, data),

  // Delete sales
  delete: (id: string | number) => api.delete(`/master-penjualan/${id}`),
};

// ============ USER ENDPOINTS (Admin) ============

export const userAPI = {
  // Get all users (admin only)
  getAll: (params?: any) => api.get("/users", { params }),

  // Get user by ID (admin only)
  getById: (id: string | number) => api.get(`/users/${id}`),

  // Create user (admin only)
  create: (data: any) => api.post("/users", data),

  // Update user (admin only)
  update: (id: string | number, data: any) => api.put(`/users/${id}`, data),

  // Delete user (admin only)
  delete: (id: string | number) => api.delete(`/users/${id}`),
};
