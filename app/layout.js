import "./globals.css";

export const metadata = {
  title: "Agency Listings Importer",
  description: "Panorama agency listings importer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
