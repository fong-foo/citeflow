export function getUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("cf_user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return user.id || user.email || "";
  } catch {
    return "";
  }
}

/** 返回按当前用户隔离的 localStorage 键名 */
export function userKey(base: string): string {
  const uid = getUserId();
  return uid ? `${base}_${uid}` : base;
}

/** 获取当前用户等级 */
export function getUserTier(): "free" | "full" {
  if (typeof window === "undefined") return "free";
  try {
    const raw = localStorage.getItem("cf_user");
    if (!raw) return "free";
    const user = JSON.parse(raw);
    return user.tier || "free";
  } catch {
    return "free";
  }
}

export type Tier = "free" | "full";
export type ScanMode = "light" | "full";

export function setUserTier(tier: Tier): void {
  try {
    const raw = localStorage.getItem("cf_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    user.tier = tier;
    localStorage.setItem("cf_user", JSON.stringify(user));
  } catch {}
}

export function hasProbeAccess(): boolean {
  return getUserTier() === "full";
}

export function hasFullAccess(): boolean {
  return getUserTier() === "full";
}

/** 清除会话（登出时调用）。只清 token 和 user，保留扫描历史等持久数据。 */
export function clearUserData(): void {
  localStorage.removeItem("cf_token");
  localStorage.removeItem("cf_user");
}
