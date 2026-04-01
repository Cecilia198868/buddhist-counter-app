"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nianfo-counter-count";

export default function HomePage() {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // 页面加载时，从 localStorage 读取数据
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = Number(saved);
        if (!Number.isNaN(parsed)) {
          setCount(parsed);
        }
      }
    } catch (error) {
      console.error("读取 localStorage 失败:", error);
    } finally {
      setMounted(true);
    }
  }, []);

  // count 变化时，保存到 localStorage
  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch (error) {
      console.error("保存到 localStorage 失败:", error);
    }
  }, [count, mounted]);

  const handleIncrement = () => {
    setCount((prev) => prev + 1);
  };

  const handleReset = () => {
    const confirmed = window.confirm("确定要清零吗？");
    if (!confirmed) return;
    setCount(0);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f8f5ee",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "32px 24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "12px",
            color: "#2c2c2c",
          }}
        >
          念佛计数
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "#666",
            marginBottom: "28px",
          }}
        >
          离线版本 · 自动保存在本机浏览器
        </p>

        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#b7791f",
            marginBottom: "32px",
            lineHeight: 1.1,
          }}
        >
          {mounted ? count : "..."}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <button
            onClick={handleIncrement}
            style={{
              width: "100%",
              padding: "18px",
              fontSize: "28px",
              fontWeight: "bold",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              background: "#d69e2e",
              color: "#fff",
            }}
          >
            +1
          </button>

          <button
            onClick={handleReset}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "18px",
              borderRadius: "14px",
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "#fff",
              color: "#333",
            }}
          >
            清零
          </button>
        </div>
      </div>
    </main>
  );
}