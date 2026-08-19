"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const previousPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    setProgress(0.1);
    setVisible(true);

    timerRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 0.9) return current;
        return current + (0.9 - current) * 0.2;
      });
    }, 150);

    timeoutRef.current = setTimeout(() => {
      setProgress(1);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => setVisible(false), 300);
    }, 700);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-transparent">
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
