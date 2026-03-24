import "./globals.css";

export const metadata = {
  title: "念佛计数正式版",
  description: "Next.js + Supabase + Vercel 正式网站版",
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