// Currency types and interfaces for admin application

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  updated_by?: number | null;
}

export interface CurrencyCreate {
  code: string;
  name: string;
  symbol: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}

export interface CurrencyUpdate {
  code?: string;
  name?: string;
  symbol?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}

export interface CurrencyFilters {
  search?: string;
  is_active?: string;
}

export interface CurrencyPagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface CurrenciesResponse {
  success: boolean;
  data: Currency[];
  pagination: CurrencyPagination;
  filters_applied?: CurrencyFilters;
}

export interface CurrencyResponse {
  success: boolean;
  data: Currency;
  message?: string;
}

export interface CurrencyDeleteResponse {
  success: boolean;
  message: string;
}

export interface CurrencyStats {
  total_currencies: number;
  active_currencies: number;
  inactive_currencies: number;
}

export interface CurrencyStatsResponse {
  success: boolean;
  data: CurrencyStats;
}
