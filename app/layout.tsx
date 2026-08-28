import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acres of Diamond Cooperative',
  description: 'Member and administration portal for Acres of Diamond Multipurpose Cooperative Society',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
