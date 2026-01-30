import type { Metadata } from 'next';
import { Space_Mono } from 'next/font/google';
import './globals.css';

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'BB Halftime Model v2 | Super Bowl LX Predictions',
  description: 'Bad Bunny Super Bowl LX Halftime Show Prediction Model - First song probabilities, setlist predictions, guest appearances, and betting edges.',
  keywords: ['Bad Bunny', 'Super Bowl', 'Halftime', 'Predictions', 'Betting', 'Kalshi', 'Polymarket'],
  authors: [{ name: 'BB Model Team' }],
  openGraph: {
    title: 'BB Halftime Model v2',
    description: 'The source of truth for Bad Bunny Super Bowl LX predictions',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BB Halftime Model v2',
    description: 'Bad Bunny Super Bowl LX Prediction Engine',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceMono.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${spaceMono.className} bg-terminal-bg text-terminal-fg`}>
        {children}
      </body>
    </html>
  );
}
