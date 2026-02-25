import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/providers/providers';

export const metadata: Metadata = {
  title: 'Sarelle - Luxury Resale Marketplace',
  description: 'Authenticated luxury items from celebrity closets and verified sellers. Every item passes through our hub for professional authentication and photography.',
  keywords: ['luxury', 'resale', 'consignment', 'authenticated', 'designer', 'marketplace'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
