"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      setMsg("注册成功，请检查邮箱验证链接。");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f6f3ee]">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-8 border border-[#e8ddd1]">
        <h1 className="text-3xl font-bold text-center mb-2">念佛计数正式版</h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Next.js + Supabase + Vercel
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            className={`flex-1 rounded-xl px-4 py-2 ${
              mode === "login" ? "bg-amber-700 text-white" : "bg-gray-100"
            }`}
            onClick={() => setMode("login")}
          >
            登录
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl px-4 py-2 ${
              mode === "signup" ? "bg-amber-700 text-white" : "bg-gray-100"
            }`}
            onClick={() => setMode("signup")}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="w-full rounded-xl bg-amber-700 text-white py-3 font-semibold"
            type="submit"
          >
            {mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm text-center text-red-600">{msg}</p>}
      </div>
    </div>
  );
}