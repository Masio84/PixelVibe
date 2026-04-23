import type { Metadata } from 'next';
import { Inter, Press_Start_2P } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PixelVibe — Oficina Virtual Isométrica',
  description: 'Conecta con tu equipo en una oficina virtual estilo retro pixel art. PixelVibe es tu Gather.Town personal.',
  keywords: ['oficina virtual', 'pixel art', 'colaboración remota', 'metaverso'],
  openGraph: {
    title: 'PixelVibe — Oficina Virtual Isométrica',
    description: 'Una oficina virtual retro con avatares en tiempo real.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${pressStart2P.variable}`}>
      <body>{children}</body>
    </html>
  );
}
