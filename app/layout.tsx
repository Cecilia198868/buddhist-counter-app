import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "念佛计数",
  description: "离线版念佛计数器",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}