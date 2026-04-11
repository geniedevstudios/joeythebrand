"use client";

import { Toaster } from "sonner";

/** Global toast host for admin saves and mutations. */
export function AdminToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-lg border border-zinc-200/80",
          title: "font-medium text-zinc-900",
          description: "text-zinc-600",
        },
      }}
    />
  );
}
