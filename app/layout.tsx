import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "AI扩写视频生成器",
  description: "输入文本，AI自动扩写并生成视频",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}