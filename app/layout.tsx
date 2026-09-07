import type { Metadata, Viewport } from 'next';
import './globals.css';
import './mobile.css';
import './wallet-transaction.css';
import WalletSync from './components/WalletSync';
import WalletTransactionGuard from './components/WalletTransactionGuard';

export const metadata: Metadata = {
  title: { default: 'Acres of Diamond Multipurpose Cooperative Society', template: '%s | Acres of Diamond' },
  description: 'A secure member-owned cooperative platform for property thrift, savings, shares, responsible loans and transparent administration.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, viewportFit: 'cover', themeColor: '#08734b' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WalletSync/><WalletTransactionGuard/>{children}</body></html>;
}
