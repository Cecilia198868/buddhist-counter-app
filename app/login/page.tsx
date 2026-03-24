"use client";

import { useState } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155]">
      
      {/* 卡片 */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
        
        <h1 className="text-2xl font-semibold text-center text-blue-200 mb-2 tracking-wide">
          念佛计数正式版
        </h1>

        <p className="text-center text-blue-300/70 mb-6 text-sm">
          Next.js · Supabase · Vercel
        </p>

        {/* 切换 */}
        <div className="flex mb-6 bg-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 transition ${
              isLogin
                ? "bg-blue-500/80 text-white"
                : "text-blue-200/70"
            }`}
          >
            登录
          </button>

          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 transition ${
              !isLogin
                ? "bg-blue-500/80 text-white"
                : "text-blue-200/70"
            }`}
          >
            注册
          </button>
        </div>

        {/* 输入框 */}
        <input
          type="email"
          placeholder="邮箱"
          className="w-full mb-4 px-4 py-3 bg-white/10 text-white placeholder-blue-200/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="密码"
          className="w-full mb-6 px-4 py-3 bg-white/10 text-white placeholder-blue-200/50 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* 按钮 */}
        <button className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition">
          {isLogin ? "登录" : "注册"}
        </button>
      </div>
    </div>
  );
}