import { useState, useEffect } from 'react';
import { apiClient, type Category, type CategoriesResponse, API_ENDPOINTS } from '../services/apiRoutes';

interface UseCategoriesParams {
  event_id?: string;
}

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export const useCategories = (params: UseCategoriesParams): UseCategoriesResult => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!params.event_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const queryParams = new URLSearchParams();
        if (params.event_id) queryParams.set('event_id', params.event_id);

        const endpoint = `${API_ENDPOINTS.CATEGORIES}?${queryParams.toString()}`;
        const response = await apiClient.request<CategoriesResponse>(endpoint);
        
        setCategories(response.data.categories || []);
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to fetch categories';
        setError(errorMessage);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [params.event_id]);

  return {
    categories,
    loading,
    error,
  };
};
