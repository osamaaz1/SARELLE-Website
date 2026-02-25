export const ST = {
  async get(k) {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async set(k, v) {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {}
  }
};
export const KEY = "wmc_sync_v1";
