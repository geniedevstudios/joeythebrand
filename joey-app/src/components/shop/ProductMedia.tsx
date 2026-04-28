"use client";

import React from "react";
/* eslint-disable @next/next/no-img-element */

interface ProductMediaProps {
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  "aria-hidden"?: boolean | "true" | "false";
  onClick?: () => void;
}

export default function ProductMedia({
  src,
  alt = "",
  className,
  loading,
  "aria-hidden": ariaHidden,
  onClick,
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
