import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
// Sagona font
const sagona = localFont({
  src: "./fonts/SagonaBook.ttf",
  variable: "--font-sagona",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Check in with Lumi - Aro Ha",
  description: "Experience personalized wellness guidance with Lumi, your AI wellness companion powered by Aro Ha.",
  openGraph: {
    title: "Check in with Lumi - Aro Ha",
    description: "Experience personalized wellness guidance with Lumi, your AI wellness companion powered by Aro Ha.",
    images: ['/logo-aroha.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Check in with Lumi - Aro Ha",
    description: "Experience personalized wellness guidance with Lumi, your AI wellness companion powered by Aro Ha.",
    images: ['/logo-aroha.png'],
  },
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.REPL_URL ? `https://${process.env.REPL_URL}` : 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sagona.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}