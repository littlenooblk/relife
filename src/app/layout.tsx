import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三国人生",
  description: "随机出生于三国时代，用选择与输入体验另一段人生。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
