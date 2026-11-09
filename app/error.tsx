"use client";

import { useEffect } from "react";

/**
 * A page failed to load. The usual cause is the connection dropping between
 * the sign-in check and the page's own reads, so the way out offered first
 * is the offline desk.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto py-10">
      <div className="sheet">
        <h1 className="t-h2 mb-2">This page would not load.</h1>
        <p className="text-[14.5px] text-ink-300 mb-5 max-w-[52ch]">
          LifeOS could not read what it needed. If the connection has
          dropped, you can keep writing at the offline desk and it will be
          sent when you are back.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/offline" className="btn">
            Write offline
          </a>
          <button type="button" onClick={reset} className="btn btn-ghost">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
