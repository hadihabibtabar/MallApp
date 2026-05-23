"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SmartImageProps extends Omit<ImageProps, "src"> {
  src?: string;
  fallbackSrc?: string;
}

export function SmartImage({
  src,
  alt,
  fallbackSrc = "/images/fallback-image.svg",
  onError,
  ...rest
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }

        onError?.(event);
      }}
    />
  );
}
