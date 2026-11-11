"use client";

import { Toaster } from "sonner";

/** Global toast host for admin saves and mutations. */
export function AdminToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      richColors
      closeButton
      className="!z-[10050]"
      toastOptions={{
        classNames: {
          toast:
            "!bg-white !border !border-[#b6b7ba]/70 !text-[#1c1e22] shadow-[0_18px_50px_rgba(28,30,34,0.14)]",
          title: "!text-[#1c1e22] !font-semibold",
          description: "!text-[#1c1e22]/70",
          icon: "!text-[#1c1e22]",
          closeButton:
            "!bg-[#f5f1eb] !text-[#1c1e22] !border-[#b6b7ba]/70 hover:!bg-[#ebe8e2] [&>svg]:!text-[#1c1e22]",
          actionButton: "!bg-[#1c1e22] !text-[#f5f1eb] !font-semibold hover:!opacity-90",
          cancelButton: "!border-[#b6b7ba]/70 !bg-[#f5f1eb] !text-[#1c1e22] hover:!bg-[#ebe8e2]",
          success: "!bg-[#ecfdf5] !border !border-emerald-500/35",
          error: "!bg-[#fef2f2] !border !border-red-500/35",
          warning: "!bg-[#fffbeb] !border !border-amber-500/35",
          info: "!bg-[#eff6ff] !border !border-sky-500/35",
          loading: "!bg-white !border !border-[#b6b7ba]/70",
        },
      }}
    />
  );
}
