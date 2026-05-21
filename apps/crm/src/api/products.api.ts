import api from './axios';

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  minStock: number;
  category: string;
  unit: string;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProductData {
  tenantId: string;
  name: string;
  price: number;
  costPrice?: number;
  quantity: number;
  minStock?: number;
  category: string;
  unit?: string;
  barcode?: string;
}

export const getProducts = (tenantId: string) =>
  api.get<Product[]>('/products', { params: { tenantId } }).then((r) => r.data);

export const getCategories = (tenantId: string) =>
  api.get<string[]>('/products/categories', { params: { tenantId } }).then((r) => r.data);

export const createProduct = (data: CreateProductData) =>
  api.post<Product>('/products', data).then((r) => r.data);

export const updateProduct = (id: string, data: Partial<CreateProductData>) =>
  api.patch<Product>(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`).then((r) => r.data);
