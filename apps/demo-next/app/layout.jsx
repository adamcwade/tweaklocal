import './globals.css';
import { CmdZeroOverlay } from '@cmdzero/react';

export const metadata = {
  title: 'Northwind — Next.js demo',
  description: 'cmdzero Next.js demo app',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
        <CmdZeroOverlay />
      </body>
    </html>
  );
}
