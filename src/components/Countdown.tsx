"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownProps {
  targetDate: string | Date | null | undefined;
  className?: string;
  expiredText?: string;
  onExpire?: () => void;
}

export function Countdown({
  targetDate,
  className = "",
  expiredText = "Registration closed",
  onExpire,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null);
      return;
    }

    const targetTime = new Date(targetDate).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const timer = setInterval(calculate, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (!targetDate || !timeLeft) {
    return null;
  }

  if (timeLeft.isExpired) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-[#e90052] ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        {expiredText}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs font-bold ${className}`}>
      <span className="flex items-center gap-1 text-[#00c853] bg-[#00c853]/10 border border-[#00c853]/30 px-2.5 py-1 rounded-lg">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        <span>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
        </span>
      </span>
    </div>
  );
}
