import './theme.css';
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { type ReactNode } from 'react';
import { metadata, viewport } from './metadata';
import { ClientLayout } from './client-layout';

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
