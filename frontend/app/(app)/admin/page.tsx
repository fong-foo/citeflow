"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stats {
  total_users: number;
  tier_distribution: { free: number; probe: number; full: number };
  scan_stats: { scanned: number; not_scanned: number };
  recent_7d: number;
  daily_registrations: { date: string; count: number }[];
}

interface UserRow {
  id: number;
  email: string;
  tier: string;
  has_light_scan: boolean;
  created_at: string;
}

type Tab = "dashboard" | "users";

export const dynamic = "force-dynamic";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cf_token");
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTier, setEditingTier] = useState<string | null>(null);

  const token = getToken();

  const fetchStats = useCallback(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 403) {
          setError("无权访问 — 仅限管理员");
          setLoading(false);
          return null;
        }
        if (!r.ok) throw new Error("加载失败");
        return r.json();
      })
      .then((data) => {
        if (data) setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError("加载数据失败，请检查后端是否启动");
        setLoading(false);
      });
  }, [token]);

  const fetchUsers = useCallback(() => {
    if (!token) return;
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`${API_BASE}/api/admin/users${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 403) return null;
        if (!r.ok) throw new Error("加载失败");
        return r.json();
      })
      .then((data) => {
        if (data) setUsers(data.users);
      })
      .catch(() => {});
  }, [token, search]);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login?redirect=/admin";
      return;
    }
    fetchStats();
  }, [token, fetchStats]);

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [tab, search, fetchUsers]);

  function handleTierChange(email: string, newTier: string) {
    if (!token) return;
    fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(email)}/tier`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tier: newTier }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("更新失败");
        return r.json();
      })
      .then(() => {
        setEditingTier(null);
        fetchUsers();
      })
      .catch(() => alert("更新失败"));
  }

  if (!token) return null;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0A0A0F" }}
      >
        <span style={{ color: "#5E5E78", fontSize: 14 }}>加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#0A0A0F" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "24px 32px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.20)",
            borderRadius: 4,
          }}
        >
          <p style={{ color: "#EF4444", fontSize: 14, margin: 0 }}>{error}</p>
        </motion.div>
        <Link
          href="/"
          style={{ color: "#5E5E78", fontSize: 13, textDecoration: "none" }}
        >
          ← 返回首页
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-6 pt-20 pb-12"
      style={{ background: "#0A0A0F" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          maxWidth: 1100,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              color: "#3B82F6",
              fontSize: 13,
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textDecoration: "none",
            }}
          >
            CiteFlow
          </Link>
          <span style={{ color: "#5E5E78", fontSize: 12 }}>/</span>
          <span style={{ color: "#C8C8D8", fontSize: 13, fontWeight: 500 }}>
            Admin
          </span>
        </div>
        <span style={{ color: "#5E5E78", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
          admin@citeflow.cn
        </span>
      </motion.div>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: "flex", gap: 0, marginBottom: 32 }}
        >
          <button
            onClick={() => setTab("dashboard")}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              border: "none",
              borderBottom: tab === "dashboard" ? "2px solid #3B82F6" : "2px solid transparent",
              color: tab === "dashboard" ? "#C8C8D8" : "#5E5E78",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
          >
            数据看板
          </button>
          <button
            onClick={() => { setTab("users"); fetchUsers(); }}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              border: "none",
              borderBottom: tab === "users" ? "2px solid #3B82F6" : "2px solid transparent",
              color: tab === "users" ? "#C8C8D8" : "#5E5E78",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
          >
            用户管理
          </button>
        </motion.div>

        {/* Dashboard Tab */}
        {tab === "dashboard" && stats && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Tier cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <StatCard label="总用户" value={stats.total_users} />
              <StatCard label="免费" value={stats.tier_distribution.free} subColor="#5E5E78" />
              <StatCard label="Probe" value={stats.tier_distribution.probe} subColor="#3B82F6" />
              <StatCard label="Full" value={stats.tier_distribution.full} subColor="#34D399" />
            </div>

            {/* Scan cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <StatCard label="已体检" value={stats.scan_stats.scanned} subColor="#34D399" />
              <StatCard label="未体检" value={stats.scan_stats.not_scanned} subColor="#5E5E78" />
            </div>

            {/* Chart */}
            <div
              style={{
                padding: 20,
                background: "#131318",
                border: "1px solid #222228",
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ color: "#C8C8D8", fontSize: 14, fontWeight: 500 }}>
                  最近 14 天注册趋势
                </span>
                <span style={{ color: "#3B82F6", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                  7日新增 {stats.recent_7d}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 4,
                  height: 120,
                  padding: "8px 0",
                }}
              >
                {stats.daily_registrations.map((d) => {
                  const maxCount = Math.max(...stats.daily_registrations.map((x) => x.count), 1);
                  const height = (d.count / maxCount) * 100;
                  return (
                    <div
                      key={d.date}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          color: d.count > 0 ? "#3B82F6" : "#3E3E50",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {d.count}
                      </span>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 24,
                          height: `${height}%`,
                          minHeight: d.count > 0 ? 4 : 1,
                          background: d.count > 0 ? "#3B82F6" : "#222228",
                          borderRadius: "2px 2px 0 0",
                          transition: "height 0.3s",
                        }}
                      />
                      <span style={{ fontSize: 9, color: "#5E5E78" }}>
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Search */}
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索邮箱..."
                style={{
                  width: "100%",
                  maxWidth: 320,
                  height: 40,
                  padding: "0 16px",
                  fontSize: 14,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 4,
                  color: "#EDEDF5",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(56,189,248,0.30)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              />
            </div>

            {/* Table */}
            <div
              style={{
                background: "#131318",
                border: "1px solid #222228",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 100px 80px 120px",
                  padding: "12px 20px",
                  borderBottom: "1px solid #222228",
                  fontSize: 12,
                  color: "#5E5E78",
                  fontWeight: 500,
                }}
              >
                <span>邮箱</span>
                <span>注册时间</span>
                <span>Tier</span>
                <span>体检</span>
                <span>操作</span>
              </div>

              {/* Rows */}
              {users.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#5E5E78", fontSize: 14 }}>
                  暂无数据
                </div>
              )}
              {users.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 100px 80px 120px",
                    padding: "12px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                    fontSize: 13,
                    color: "#C8C8D8",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.email}
                  </span>
                  <span style={{ color: "#9A9AB0", fontSize: 12 }}>
                    {u.created_at ? u.created_at.slice(0, 10) : "-"}
                  </span>
                  <span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 500,
                        background:
                          u.tier === "full"
                            ? "rgba(52,211,153,0.12)"
                            : u.tier === "probe"
                            ? "rgba(59,130,246,0.12)"
                            : "rgba(255,255,255,0.05)",
                        color:
                          u.tier === "full"
                            ? "#34D399"
                            : u.tier === "probe"
                            ? "#3B82F6"
                            : "#9A9AB0",
                      }}
                    >
                      {u.tier}
                    </span>
                  </span>
                  <span style={{ fontSize: 13 }}>
                    {u.has_light_scan ? (
                      <span style={{ color: "#34D399" }}>✓</span>
                    ) : (
                      <span style={{ color: "#5E5E78" }}>✗</span>
                    )}
                  </span>
                  <span>
                    {editingTier === u.email ? (
                      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <select
                          value={u.tier}
                          onChange={(e) => handleTierChange(u.email, e.target.value)}
                          style={{
                            padding: "2px 6px",
                            fontSize: 12,
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: 3,
                            color: "#EDEDF5",
                            outline: "none",
                          }}
                        >
                          <option value="free">free</option>
                          <option value="probe">probe</option>
                          <option value="full">full</option>
                        </select>
                        <button
                          onClick={() => setEditingTier(null)}
                          style={{
                            padding: "2px 6px",
                            fontSize: 11,
                            background: "transparent",
                            border: "none",
                            color: "#5E5E78",
                            cursor: "pointer",
                          }}
                        >
                          取消
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setEditingTier(u.email)}
                        style={{
                          padding: "4px 12px",
                          fontSize: 12,
                          background: "rgba(59,130,246,0.10)",
                          border: "1px solid rgba(59,130,246,0.15)",
                          borderRadius: 3,
                          color: "#3B82F6",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(59,130,246,0.18)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(59,130,246,0.10)";
                        }}
                      >
                        改
                      </button>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subColor,
}: {
  label: string;
  value: number;
  subColor?: string;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#131318",
        border: "1px solid #222228",
        borderRadius: 4,
      }}
    >
      <div style={{ fontSize: 12, color: "#5E5E78", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: subColor || "#EDEDF5",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}
