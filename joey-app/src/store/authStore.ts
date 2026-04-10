export type User = {
  name: string;
  email: string;
};

const STORAGE_KEY = "jtb_auth";

const loadUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

let user: User | null = typeof window !== "undefined" ? loadUser() : null;
let subscribers: (() => void)[] = [];

const saveUser = (u: User | null) => {
  if (typeof window === "undefined") return;
  if (u) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const authStore = {
  getUser: () => user,
  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => { subscribers = subscribers.filter((s) => s !== fn); };
  },
  notify: () => subscribers.forEach((fn) => fn()),

  getInitials: () => {
    if (!user) return "";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  },

  signIn: (name: string, email: string) => {
    user = { name, email };
    saveUser(user);
    authStore.notify();
  },

  signOut: () => {
    user = null;
    saveUser(null);
    authStore.notify();
  },
};
