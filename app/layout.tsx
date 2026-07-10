import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vantage Arm Simulation',
  description: 'Browser-based 6-DOF industrial arm control simulation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-graphite-900 font-sans text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
