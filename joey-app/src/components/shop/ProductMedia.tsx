"use client";

import React from "react";

interface ProductMediaProps {
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  "aria-hidden"?: boolean | "true" | "false";
  onClick?: () => void;
  /** Automatically passes standard video attributes for looping without sound. */
  isVideoHoverState?: boolean;
}

export default function ProductMedia({
  src,
  alt = "",
  className,
  loading,
  "aria-hidden": ariaHidden,
  onClick,
  isVideoHoverState = false,
}: ProductMediaProps) {
  const isVideo = src && /\.(mp4|webm)$/i.test(src.trim());

  if (isVideo) {
    return (
      <video
        src={src.trim()}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden={ariaHidden}
        onClick={onClick}
      />
    );
  }

  return (
    <img
      src={src.trim()}
      alt={alt}
      className={className}
      loading={loading}
      aria-hidden={ariaHidden}
      onClick={onClick}
    />
  );
}
