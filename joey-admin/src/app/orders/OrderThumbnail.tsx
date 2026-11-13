/* eslint-disable @next/next/no-img-element */

import { Package } from "lucide-react";
import { isVideoUrl } from "@/lib/isVideoUrl";

export default function OrderThumbnail({ src }: { src?: string }) {
  return (
    <span aria-hidden="true" className="grid h-12 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500">
      {!src ? <Package size={16} /> : isVideoUrl(src) ? (
        <video src={src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
      ) : (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      )}
    </span>
  );
}
