import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-5">
      <h1 className="font-display font-semibold text-ink text-[28px]">Page not found</h1>
      <p className="text-ink-soft text-[13.5px]">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-3 inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-md bg-slate text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition"
      >
        Back to home
      </Link>
    </div>
  );
}