import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Assistant Studio',
  description:
    'An assistant-building studio where a human and their agent work on the same surface, with every sensitive action behind a deterministic consent gate enforced outside the model.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
