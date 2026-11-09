import "./globals.css";

export const metadata = {
  title: "Läxhjälpen",
  description: "Barnens egna hjälplärare",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAF7",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
