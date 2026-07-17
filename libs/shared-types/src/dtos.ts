// Shared DTO shapes (mirrors backend class-validator DTOs for frontend typing)

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  taxCode: string;
  reorderLevel: number;
  costPrice: number;
  salePrice: number;
}

export interface InvoiceLineItemDto {
  productId: string;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
}

export interface InvoiceDto {
  id: string;
  number: string;
  customerId: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  lineItems: InvoiceLineItemDto[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface DashboardSummary {
  salesToday: number;
  receivables: number;
  payables: number;
  lowStockCount: number;
  cashBalance: number;
  bankBalance: number;
}
