export const metadata = {
  title: "RideGuide rider poll",
  description: "Three minutes on what works and what does not in transit apps.",
  openGraph: {
    title: "RideGuide rider poll",
    description: "Tell us what works, what drives you up the wall, and what your ideal transit app would do.",
    type: "website",
  },
};

export const viewport = { themeColor: "#FAF7F2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAF7F2" }}>{children}</body>
    </html>
  );
}
