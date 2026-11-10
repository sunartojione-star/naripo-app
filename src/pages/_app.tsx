import { useEffect } from "react";
import type { AppProps } from "next/app";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
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