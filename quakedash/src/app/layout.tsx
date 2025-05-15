import { Toaster } from '@/components/ui/sonner';
import Sidebar from './components/Sidebar';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QuakeDash',
  description: 'Live data and visualizations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-[100vh]">
      <Toaster position="top-right" richColors />
        <Sidebar />
        <main className="flex-1 p-4 overflow-auto bg-french-gray-2 raisin-black">{children}</main>
      </body>
    </html>
  );
}
