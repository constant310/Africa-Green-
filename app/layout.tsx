import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: { default: 'Acres of Diamond Multipurpose Cooperative Society', template: '%s | Acres of Diamond' },
  description: 'A secure digital cooperative platform for membership, savings, shares, responsible credit and member growth.',
};
export const viewport: Viewport = { themeColor: '#0d7048', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
