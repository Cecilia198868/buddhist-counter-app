"use client";

import { useState } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-2">
          念佛计数正式版
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Next.js + Supabase + Vercel
        </p>

        {/* 切换按钮 */}
        <div className="flex mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-l-lg ${
              isLogin
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            登录
          </button>

          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-r-lg ${
              !isLogin
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            注册
          </button>
        </div>

        {/* 输入框 */}
        <input
          type="email"
          placeholder="邮箱"
          className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="password"
          placeholder="密码"
          className="w-full mb-6 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* 按钮 */}
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
          {isLogin ? "登录" : "注册"}
        </button>
      </div>
    </div>
  );
}