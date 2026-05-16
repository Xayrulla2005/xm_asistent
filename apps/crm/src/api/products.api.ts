import api from './axios';

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProductData {
  tenantId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  unit?: string;
}

export const getProducts = (tenantId: string) =>
  api.get<Product[]>('/products', { params: { tenantId } }).then((r) => r.data);

export const createProduct = (data: CreateProductData) =>
  api.post<Product>('/products', data).then((r) => r.data);

export const updateProduct = (id: string, data: Partial<CreateProductData>) =>
  api.patch<Product>(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`).then((r) => r.data);
