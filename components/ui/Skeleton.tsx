"use client";

export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "animate-pulse rounded-md bg-gray-200/80 dark:bg-gray-800/40 " + className
      }
    />
  );
}
