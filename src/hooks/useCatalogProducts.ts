import { useCallback, useEffect, useState } from "react";

import { repositories } from "@/src/repositories";
import type { Product } from "@/src/types";

let catalogCache: Product[] | null = null;
let catalogInflight: Promise<Product[]> | null = null;

export interface CatalogProductsState {
  products: Product[];
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

/** Load catalogue data through the repository contract, independent of source. */
export function useCatalogProducts(): CatalogProductsState {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load =
      catalogCache != null
        ? Promise.resolve(catalogCache)
        : (catalogInflight ??= Promise.resolve(repositories.catalog.listProducts()));
    load
      .then((result) => {
        if (active) {
          catalogCache = result;
          setProducts(result);
        }
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
        catalogInflight = null;
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    catalogCache = null;
    catalogInflight = null;
    setHasError(false);
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  return { products, isLoading, hasError, retry };
}
