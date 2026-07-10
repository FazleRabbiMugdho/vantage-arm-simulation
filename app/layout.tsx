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
      <body className="min-h-screen bg-gray-900 text-white">{children}</body>
    </html>
  );
}
