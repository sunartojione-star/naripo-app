'use client';

import Header from './Header';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 w-full">
      <Header />
      {/* pb-16 hanya di HP untuk Bottom Navigation Bar, md:pb-6 di PC */}
      <main className="flex-1 w-full pb-16 md:pb-6">
        {children}
      </main>
    </div>
  );
}