import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, Dancing_Script } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/providers';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-dancing',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'WIMC - Luxury Resale Marketplace',
  description: 'Authenticated luxury items from celebrity closets and verified sellers. Every item passes through our hub for professional authentication and photography.',
  keywords: ['luxury', 'resale', 'consignment', 'authenticated', 'designer', 'marketplace'],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dancingScript.variable}`}>
      <body className={dmSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
