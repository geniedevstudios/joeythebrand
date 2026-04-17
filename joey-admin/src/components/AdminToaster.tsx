"use client";

import { Toaster } from "sonner";

/** Global toast host for admin saves and mutations. Globals remap `.bg-white` to a dark tint, so we force solid surfaces + light text. */
export function AdminToaster() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      className="!z-[10050]"
      toastOptions={{
        classNames: {
          toast:
            "!bg-[#1a1d23] !border !border-white/12 !text-white shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md",
          title: "!text-white !font-semibold",
          description: "!text-white/75",
          icon: "!text-white",
          closeButton:
            "!bg-white/10 !text-white !border-white/15 hover:!bg-white/15 [&>svg]:!text-white",
          actionButton: "!bg-[#d6ff2a] !text-black !font-semibold hover:!opacity-90",
          cancelButton: "!border-white/20 !bg-white/5 !text-white hover:!bg-white/10",
          success: "!bg-[#0d1812] !border !border-emerald-500/40",
          error: "!bg-[#1a0f0f] !border !border-red-500/45",
          warning: "!bg-[#1a1508] !border !border-amber-500/40",
          info: "!bg-[#0f1520] !border !border-sky-500/35",
          loading: "!bg-[#1a1d23] !border !border-white/12",
        },
      }}
    />
  );
}
