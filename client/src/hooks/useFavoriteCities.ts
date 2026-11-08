import { useCallback, useEffect, useState } from "react";
import { FAVORITES_STORAGE_KEY, parseFavoriteSlugs, toggleFavoriteSlug } from "@/lib/favorites";

function readStoredFavorites(): string[] {
  try {
    return parseFavoriteSlugs(window.localStorage.getItem(FAVORITES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function useFavoriteCities() {
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>(readStoredFavorites);

  const toggleFavorite = useCallback((slug: string) => {
    setFavoriteSlugs((current) => {
      const next = toggleFavoriteSlug(current, slug);
      try {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing or storage limits must not break weather browsing.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY && event.key !== null) return;
      setFavoriteSlugs(parseFavoriteSlugs(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { favoriteSlugs, toggleFavorite };
}
