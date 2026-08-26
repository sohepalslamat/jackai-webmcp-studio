import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'استوديو المساعدين — Assistant Studio',
  description:
    'An assistant-building studio where a human and their agent work on the same surface, with every sensitive action behind a deterministic consent gate enforced outside the model.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Arabic RTL is the default render. The language toggle updates lang/dir on
  // the client; there is no locale in the URL and no i18n library.
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
