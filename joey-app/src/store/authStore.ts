import { supabase } from "@/lib/supabase";

export type User = {
  id: string;
  name: string;
  email: string;
};

let user: User | null = null;
let subscribers: (() => void)[] = [];

const notify = () => subscribers.forEach((fn) => fn());

// Initialise from existing Supabase session on load
if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      user = {
        id: session.user.id,
        name:
          (session.user.user_metadata?.full_name as string) ||
          session.user.email?.split("@")[0] ||
          "Member",
        email: session.user.email || "",
      };
      notify();
    }
  });

  // Listen for auth state changes (sign in, sign out, token refresh, etc.)
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      user = {
        id: session.user.id,
        name:
          (session.user.user_metadata?.full_name as string) ||
          session.user.email?.split("@")[0] ||
          "Member",
        email: session.user.email || "",
      };
    } else {
      user = null;
    }
    notify();
  });
}

export const authStore = {
  getUser: () => user,

  subscribe: (fn: () => void) => {
    subscribers.push(fn);
    return () => {
      subscribers = subscribers.filter((s) => s !== fn);
    };
  },

  getInitials: () => {
    if (!user) return "";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  },

  signIn: async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },

  /**
   * When "Confirm email" is enabled in Supabase, the user is created but `session` is null
   * until they verify via OTP (template uses `{{ .Token }}`) or the confirmation link.
   * Returns whether the client should show the email verification / OTP step.
   */
  signUp: async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ needsEmailVerification: boolean }> => {
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/account`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      const m = error.message.toLowerCase();
      if (
        m.includes("already registered") ||
        m.includes("already been registered") ||
        m.includes("user already exists") ||
        m.includes("email address is already")
      ) {
        const err = new Error(
          "An account with this email already exists. Sign in instead.",
        );
        err.name = "DuplicateSignupEmail";
        throw err;
      }
      throw new Error(error.message);
    }

    /** With email confirmation on, Supabase may return a user with no identities to limit enumeration. */
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      const err = new Error("An account with this email already exists. Sign in instead.");
      err.name = "DuplicateSignupEmail";
      throw err;
    }

    const needsEmailVerification = !data.session;
    return { needsEmailVerification };
  },

  verifySignupOTP: async (email: string, token: string): Promise<void> => {
    const trimmed = token.replace(/\s/g, "");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: "signup",
    });
    if (error) throw new Error(error.message);
  },

  resendSignupOTP: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw new Error(error.message);
  },

  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },
};
