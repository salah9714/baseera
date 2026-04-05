export const metadata = {
  title: "تداول بصيرة | بيانات حية + TradingView",
  description: "نظام ذكاء استثماري للأسهم السعودية مع بيانات حية",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#0b1120", color: "#e2e8f0", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
