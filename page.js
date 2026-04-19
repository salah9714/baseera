export const metadata = { title: "تداول بصيرة", description: "نظام ذكاء استثماري" };
export const viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }) {
  return (<html lang="ar" dir="rtl"><body style={{ margin: 0, background: "#0b1120", color: "#e2e8f0", fontFamily: "'Segoe UI',sans-serif" }}>{children}</body></html>);
}
