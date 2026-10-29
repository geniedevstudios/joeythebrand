import { supabase } from "@/lib/supabase";
import { getEmailBaseUrl } from "@/lib/emailAssets";

export type User = {
  id: string;
  name: string;
  email: string;
};

let user: User | null = null;
let subscribers: (() => void)[] = [];

const notify = () => subscribers.forEach((fn) => fn());

// Initialise from existing Supabase session on load
// Uses getUser() (server-validated) rather than getSession() (local JWT only)
// so deleted users are caught immediately on page load.
if (typeof window !== "undefined") {
  supabase.auth.getUser().then(({ data: { user: u }, error }) => {
    if (u && !error) {
      user = {
        id: u.id,
        name:
          (u.user_metadata?.full_name as string) ||
          u.email?.split("@")[0] ||
          "Member",
        email: u.email || "",
      };
      notify();
    } else if (error) {
      // User no longer exists or token is invalid — clear any stale session
      void supabase.auth.signOut();
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

  // Validate session server-side every time the tab regains focus.
  // getUser() hits the Supabase server — if the user was deleted, it returns
  // an error and we sign them out immediately rather than waiting for JWT expiry.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    supabase.auth.getUser().then(({ error }) => {
      if (error && user) {
        user = null;
        notify();
        void supabase.auth.signOut();
      }
    });
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
    const emailRedirectTo = `${getEmailBaseUrl()}/account`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo,
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
      options: { emailRedirectTo: `${getEmailBaseUrl()}/account` },
    });
    if (error) throw new Error(error.message);
  },

  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  /** Step 1 – send a 6-digit OTP to the user's email for password reset. */
  sendResetOTP: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined, // we use OTP, not magic-link redirect
    });
    if (error) throw new Error(error.message);
  },

  /** Step 2 – exchange the OTP for a session (type = "recovery"). */
  verifyResetOTP: async (email: string, token: string): Promise<void> => {
    const trimmed = token.replace(/\s/g, "");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: trimmed,
      type: "recovery",
    });
    if (error) throw new Error(error.message);
  },

  /** Step 3 – set the new password (must be called while a recovery session is active). */
  updatePassword: async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },
};
