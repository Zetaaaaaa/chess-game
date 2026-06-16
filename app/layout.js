import './globals.css';

export const metadata = {
  title: 'Chess - 2 Player',
  description: 'Real-time 2-player chess game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}