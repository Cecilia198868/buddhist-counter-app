"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("请输入邮箱和密码");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("注册成功，请去邮箱查收验证邮件");
      }
    } catch (err) {
      setMessage("操作失败，请稍后再试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#1e293b,#0f172a)] px-4">
      <div className="absolute h-[600px] w-[600px] rounded-full bg-blue-400/10 blur-3xl animate-pulse" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-wide text-blue-100">
          念佛计数正式版
        </h1>

        <p className="mb-6 text-center text-sm text-blue-200/60">
          安静 · 专注 · 持续
        </p>

        <div className="mb-6 flex overflow-hidden rounded-lg bg-white/10">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setMessage("");
            }}
            className={`flex-1 py-2 transition ${
              isLogin ? "bg-blue-500/80 text-white" : "text-blue-200/70"
            }`}
          >
            登录
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setMessage("");
            }}
            className={`flex-1 py-2 transition ${
              !isLogin ? "bg-blue-500/80 text-white" : "text-blue-200/70"
            }`}
          >
            注册
          </button>
        </div>

        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {message && (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-blue-100">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-400 py-3 font-medium text-white transition hover:from-blue-600 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "处理中..." : isLogin ? "登录" : "注册"}
        </button>

        <p className="mt-6 text-center text-xs text-blue-200/40">
          一声佛号，一份清净
        </p>
      </div>
    </div>
  );
}