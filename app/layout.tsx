import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "بوابة قطر لوّل | عِش الماضي واكتشف الحكاية",
  description: "تجربة تراثية تفاعلية تأخذ الزائر في رحلة إلى قطر القديمة.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="codex-preview" content="development" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
