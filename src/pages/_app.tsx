import { useEffect } from "react";
import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { detectBranchBrand } from "@/components/Layout/Header";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const brand = detectBranchBrand(window.location.hostname);
      const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (iconLink) {
        iconLink.href = brand.logo;
      }
      const appleLink = document.querySelector<HTMLLinkElement>(
        'link[rel="apple-touch-icon"]'
      );
      if (appleLink) {
        appleLink.href = brand.logo;
      }
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("PWA Service Worker terdaftar:", registration.scope);
          })
          .catch((err) => {
            console.error("Gagal mendaftarkan PWA:", err);
          });
      });
    }
  }, []);

  return <Component {...pageProps} />;
}