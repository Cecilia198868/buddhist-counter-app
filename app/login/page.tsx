"use client";

import { useState } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#1e293b, #0f172a)] relative overflow-hidden">
      
      {/* 柔光效果 */}
      <div className="absolute w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>

      {/* 卡片 */}
      <div className="relative w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
        
        {/* 标题 */}
        <h1 className="text-2xl font-semibold text-center text-blue-100 mb-2 tracking-wide">
          念佛计数正式版
        </h1>

        <p className="text-center text-blue-200/60 mb-6 text-sm">
          安静 · 专注 · 持续
        </p>

        {/* 登录/注册切换 */}
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
          className="w-full mb-4 px-4 py-3 bg-white/10 text-white placeholder-blue-200/40 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="密码"
          className="w-full mb-6 px-4 py-3 bg-white/10 text-white placeholder-blue-200/40 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* 按钮 */}
        <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white rounded-lg font-medium transition">
          {isLogin ? "登录" : "注册"}
        </button>

        {/* 底部一句话（很关键气质） */}
        <p className="text-center text-blue-200/40 text-xs mt-6">
          一声佛号，一份清净
        </p>
      </div>
    </div>
  );
}