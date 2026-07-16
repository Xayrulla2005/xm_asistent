import api from './axios';

export interface Branch {
  id:            string;
  tenantId:      string;
  name:          string;
  address:       string | null;
  phone:         string | null;
  managerName:   string | null;
  notes:         string | null;
  isActive:      boolean;
  transferCount: number;
  createdAt:     string;
  updatedAt:     string;
}

export interface BranchTransfer {
  id:           string;
  tenantId:     string;
  fromBranchId: string | null;
  fromBranch:   { id: string; name: string } | null;
  toBranchId:   string | null;
  toBranch:     { id: string; name: string } | null;
  productId:    string;
  productName:  string;
  quantity:     number;
  unitCost:     number;
  status:       'pending' | 'completed' | 'cancelled';
  notes:        string | null;
  initiatedBy:  string | null;
  createdAt:    string;
}

export interface BranchInventoryRow {
  productId:   string;
  productName: string;
  incoming:    number;
  outgoing:    number;
  net:         number;
}

export interface BranchStats {
  total:          number;
  active:         number;
  transfersToday: number;
  inventoryByBranch: Record<string, { productName: string; qty: number }[]>;
}

export interface CreateBranchPayload {
  name:         string;
  address?:     string;
  phone?:       string;
  managerName?: string;
  notes?:       string;
  isActive?:    boolean;
}

export interface CreateTransferPayload {
  fromBranchId?: string | null;
  toBranchId?:   string | null;
  productId:     string;
  quantity:      number;
  unitCost?:     number;
  notes?:        string;
}

export const getBranches       = ()             => api.get<Branch[]>('/branches').then(r => r.data);
export const getBranchStats    = ()             => api.get<BranchStats>('/branches/stats').then(r => r.data);
export const getBranch         = (id: string)  => api.get<Branch>(`/branches/${id}`).then(r => r.data);
export const getBranchInventory= (id: string)  => api.get<BranchInventoryRow[]>(`/branches/${id}/inventory`).then(r => r.data);
export const createBranch      = (dto: CreateBranchPayload) => api.post<Branch>('/branches', dto).then(r => r.data);
export const updateBranch      = (id: string, dto: Partial<CreateBranchPayload>) => api.patch<Branch>(`/branches/${id}`, dto).then(r => r.data);
export const deleteBranch      = (id: string)  => api.delete(`/branches/${id}`);
export const createTransfer    = (dto: CreateTransferPayload) => api.post<BranchTransfer>('/branches/transfers', dto).then(r => r.data);
export const getTransfers      = (params?: { branchId?: string; page?: number; limit?: number }) =>
  api.get<{ data: BranchTransfer[]; total: number }>('/branches/transfers/list', { params }).then(r => r.data);
