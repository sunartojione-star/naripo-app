'use client';

import Header from './Header';
// import Footer from './Footer';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 w-full">
      <Header />
      {/* flex-1 w-full tanpa px-4/py-8 agar halaman bisa melebar PENUH ke tepi layar */}
      <main className="flex-1 w-full">
        {children}
      </main>
      {/* <Footer /> */}
    </div>
  );
}