import { useCallback, useEffect, useState } from "react";
import { productAPI } from "@/utils/laravelAPI";
import { Product } from "@/types";

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProducts(params?: any): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await productAPI.getAll(params);

      // Handle Laravel API response structure
      const data = response.data || response;
      setProducts(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}

interface UseProductReturn {
  product: Product | null;
  loading: boolean;
  error: string | null;
}

export function useProductDetail(
  productId?: string | number,
): UseProductReturn {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await productAPI.getById(productId);
        const data = response.data || response;
        setProduct(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch product");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, loading, error };
}
