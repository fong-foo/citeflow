"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "login" | "register";

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function validate(): boolean {
    const e: FieldErrors = {};

    if (!email.trim()) {
      e.email = "请输入邮箱";
    } else if (!email.includes("@") || !email.includes(".")) {
      e.email = "邮箱格式不正确";
    }

    if (!password) {
      e.password = "请输入密码";
    } else if (password.length < 8) {
      e.password = "密码至少8位";
    }

    if (tab === "register" && password !== confirmPassword) {
      e.confirmPassword = "两次密码不一致";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.detail || "请求失败，请重试");
        return;
      }

      localStorage.setItem("cf_token", data.token);
      localStorage.setItem("cf_user", JSON.stringify(data.user));
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || (data.user?.is_admin ? "/admin" : "/scan");
      window.location.href = redirect;
    } catch {
      setApiError("网络错误，请检查后端是否启动");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleClick() {
    alert("Google登录开发中，敬请期待");
  }

  function handleForgotPassword() {
    alert("密码重置功能开发中");
  }

  function clearError(field: string) {
    if (errors[field as keyof FieldErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof FieldErrors];
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-12">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <span className="font-mono text-sm font-medium tracking-wider text-cf-accent group-hover:text-cf-accent-glow transition-colors duration-300">
            CiteFlow
          </span>
        </Link>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-[400px] p-8 relative"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Tabs */}
        <div className="flex mb-8">
          <button
            onClick={() => { setTab("login"); setErrors({}); }}
            className="flex-1 relative pb-3 text-sm font-medium transition-colors duration-300"
            style={{ color: tab === "login" ? "#C8C8D8" : "#5E5E78" }}
          >
            登录
            {tab === "login" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "#38BDF8" }}
              />
            )}
          </button>
          <button
            onClick={() => { setTab("register"); setErrors({}); }}
            className="flex-1 relative pb-3 text-sm font-medium transition-colors duration-300"
            style={{ color: tab === "register" ? "#C8C8D8" : "#5E5E78" }}
          >
            注册
            {tab === "register" && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "#38BDF8" }}
              />
            )}
          </button>
        </div>

        {/* Form */}
        <motion.form
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* API Error */}
          {apiError && (
            <div
              className="px-4 py-2.5 text-xs rounded-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.20)",
                color: "#EF4444",
              }}
            >
              {apiError}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs text-cf-muted mb-1.5">邮箱地址</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              placeholder="your@email.com"
              className="w-full h-11 px-4 text-sm rounded-sm transition-colors duration-300 outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: touched.email && errors.email
                  ? "1px solid rgba(239,68,68,0.40)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: "#EDEDF5",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = touched.email && errors.email
                  ? "rgba(239,68,68,0.40)"
                  : "rgba(56,189,248,0.30)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = touched.email && errors.email
                  ? "rgba(239,68,68,0.40)"
                  : "rgba(255,255,255,0.06)";
              }}
            />
            {touched.email && errors.email && (
              <p className="text-xs text-cf-danger mt-1.5">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs text-cf-muted mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              placeholder={tab === "register" ? "至少8位" : "输入密码"}
              className="w-full h-11 px-4 text-sm rounded-sm transition-colors duration-300 outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: touched.password && errors.password
                  ? "1px solid rgba(239,68,68,0.40)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: "#EDEDF5",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = touched.password && errors.password
                  ? "rgba(239,68,68,0.40)"
                  : "rgba(56,189,248,0.30)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = touched.password && errors.password
                  ? "rgba(239,68,68,0.40)"
                  : "rgba(255,255,255,0.06)";
              }}
            />
            {touched.password && errors.password && (
              <p className="text-xs text-cf-danger mt-1.5">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password (register only) */}
          {tab === "register" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-xs text-cf-muted mb-1.5">确认密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
                onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                placeholder="再次输入密码"
                className="w-full h-11 px-4 text-sm rounded-sm transition-colors duration-300 outline-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: touched.confirmPassword && errors.confirmPassword
                    ? "1px solid rgba(239,68,68,0.40)"
                    : "1px solid rgba(255,255,255,0.06)",
                  color: "#EDEDF5",
                }}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-xs text-cf-danger mt-1.5">{errors.confirmPassword}</p>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-sm font-medium rounded-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.20)",
              color: "#EDEDF5",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "rgba(56,189,248,0.20)";
                e.currentTarget.style.borderColor = "rgba(56,189,248,0.35)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "rgba(56,189,248,0.12)";
                e.currentTarget.style.borderColor = "rgba(56,189,248,0.20)";
              }
            }}
          >
            {loading
              ? (tab === "login" ? "登录中..." : "注册中...")
              : (tab === "login" ? "登录" : "注册")
            }
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-xs text-cf-muted">或</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            className="w-full h-11 text-sm rounded-sm transition-colors duration-300 inline-flex items-center justify-center gap-2.5"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#9A9AB0",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {/* Google G Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google 登录
          </button>

          {/* Forgot password (login only) */}
          {tab === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-cf-muted hover:text-cf-secondary transition-colors duration-300"
              >
                忘记密码？
              </button>
            </div>
          )}

          {/* Switch tab (register only) */}
          {tab === "register" && (
            <div className="text-center">
              <span className="text-xs text-cf-muted">已有账号？</span>
              <button
                type="button"
                onClick={() => { setTab("login"); setErrors({}); }}
                className="text-xs text-cf-accent hover:text-cf-accent-glow ml-1 transition-colors duration-300"
              >
                去登录
              </button>
            </div>
          )}
        </motion.form>
      </motion.div>

      {/* Back to home */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6"
      >
        <Link
          href="/"
          className="text-xs text-cf-muted hover:text-cf-secondary transition-colors duration-300"
        >
          ← 返回首页
        </Link>
      </motion.div>
    </div>
  );
}
