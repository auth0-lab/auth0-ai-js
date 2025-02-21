"use client";
import { ReactNode, useEffect } from "react";

export const Redirect = ({ url, timeout, children }: { url: string; timeout?: number; children?: ReactNode }) => {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = url;
    }, timeout ?? 0);
  }, [url]);
  return children;
};
