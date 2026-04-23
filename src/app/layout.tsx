import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
