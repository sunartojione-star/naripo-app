import { useEffect, useState } from "react";
import api from "@/utils/api";
// import { Product } from '@types/index';
import { Product } from "@/types";

interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

export function useProduct(productId?: string): UseProductReturn {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/products/${productId}`);
        setProduct(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch product");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, loading, error };
}
