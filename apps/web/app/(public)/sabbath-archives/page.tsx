"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, CalendarDays, Loader2, ChevronUp } from "lucide-react";
import { sabbathApi } from "@/lib/api";

type SabbathMessage = {
  id: string;
  message: string;
  sabbathDate: string;
  createdAt: string;
  updatedAt: string;
};

type Cursor = {
  sabbathDate: string;
  createdAt: string;
};

type MonthOption = {
  month: string;
  count: number;
};

const PAGE_SIZE = 30;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const toSaturdayDateString = (value: string): string => {
  if (!value) return value;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  if (date.getDay() === 5) date.setDate(date.getDate() + 1);
  return toDateString(date);
};

const formatDateLabel = (value: string) => {
  const saturday = toSaturdayDateString(value);
  const date = new Date(`${saturday}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatMonthLabel = (value: string) => {
  const date = new Date(`${value}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return MONTH_LABEL_FORMAT.format(date);
};

const linkify = (text: string) => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_REGEX)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    nodes.push(
      <a
        key={`${url}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-green-500/60 hover:decoration-green-600 text-green-700 hover:text-green-800 transition-colors break-all"
      >
        {url}
      </a>
    );
    lastIndex = index + url.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
};

function SkeletonCard({ index }: { index: number }) {
  const widths = [3, 5, 4, 2, 4, 3];
  return (
    <article className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
      <div className="h-3 w-40 rounded-full bg-green-100 animate-pulse mb-4" style={{ animationDelay: `${index * 60}ms` }} />
      <div className="space-y-2.5">
        {widths.map((w, i) => (
          <div
            key={i}
            className="h-3.5 rounded-full bg-stone-100 animate-pulse"
            style={{ width: `${w * 15}%`, animationDelay: `${index * 60 + i * 70}ms` }}
          />
        ))}
      </div>
    </article>
  );
}

export default function SabbathArchivesPage() {
  const [messages, setMessages] = useState<SabbathMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const seqRef = useRef(0);
  loadingRef.current = initialLoading || loadingMore;

  const hasFilters = month !== "" || debouncedQuery !== "";

  const loadMonths = useCallback(async () => {
    try {
      const payload = await sabbathApi.months();
      setMonths(payload.months ?? []);
    } catch {
      /* months are optional — the archive still works without the dropdown */
    }
  }, []);

  const fetchPage = useCallback(
    async ({ cursor, replace }: { cursor?: Cursor; replace?: boolean }) => {
      if (replace) {
        seqRef.current += 1;
        setMessages([]);
        setNextCursor(null);
        setInitialLoading(true);
        setError(null);
      } else {
        if (loadingRef.current) return;
        setLoadingMore(true);
        setError(null);
      }
      const seq = seqRef.current;
      try {
        const payload = await sabbathApi.list({
          limit: PAGE_SIZE,
          month: month || undefined,
          q: debouncedQuery || undefined,
          cursorDate: cursor?.sabbathDate,
          cursorCreatedAt: cursor?.createdAt,
        });
        if (seq !== seqRef.current) return;
        setMessages((prev) => (replace ? payload.messages : [...prev, ...payload.messages]));
        setNextCursor(payload.nextCursor);
      } catch {
        if (seq === seqRef.current && replace) {
          setError("We could not load the Sabbath archives. Please try again.");
        }
      } finally {
        if (seq === seqRef.current) {
          setInitialLoading(false);
          setLoadingMore(false);
        }
        loadingRef.current = false;
      }
    },
    [month, debouncedQuery]
  );

  const reset = useCallback(() => {
    fetchPage({ replace: true });
  }, [fetchPage]);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    reset();
  }, [month, debouncedQuery, reset]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingRef.current) {
          fetchPage({ cursor: nextCursor });
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, fetchPage]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadedCount = messages.length;
  const matchedMonthCount = month ? (months.find((m) => m.month === month)?.count ?? 0) : 0;

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');
      `}</style>

      {/* ── Header ── */}
      <header className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-green-600/70 font-medium mb-3">
          Shabbat Shalom
        </p>
        <h1
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-3xl sm:text-4xl text-green-900 font-semibold leading-tight"
        >
          Sabbath Archives
        </h1>
        <p
          style={{ fontFamily: "'Crimson Pro', serif" }}
          className="mt-2 text-lg text-stone-500 font-light max-w-xl mx-auto"
        >
          Every Sabbath message ever shared, gathered in one quiet place. Read, search, and
          remember the blessings of the weeks gone by.
        </p>
      </header>

      {/* ── Controls ── */}
      <div className="sticky top-[3.5rem] z-30 -mx-3 px-3 sm:-mx-4 sm:px-4 py-3 bg-[#f9fafb]/90 backdrop-blur-md border-b border-stone-200/60 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Search messages</span>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the archives…"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-10 text-sm text-stone-700 placeholder:text-stone-400 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </label>

          <label className="relative sm:w-56">
            <span className="sr-only">Filter by month</span>
            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full appearance-none rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-9 text-sm text-stone-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all cursor-pointer"
            >
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {formatMonthLabel(m.month)} · {m.count}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none text-xs">▼</span>
          </label>
        </div>
      </div>

      {/* ── Status line ── */}
      <div className="mb-5 flex items-center justify-between text-xs text-stone-400">
        <p className="font-medium tracking-wide">
          {initialLoading
            ? "Gathering messages…"
            : debouncedQuery
              ? `${loadedCount} result${loadedCount === 1 ? "" : "s"}${month ? ` in ${formatMonthLabel(month)}` : ""}`
              : month
                ? `${matchedMonthCount} message${matchedMonthCount === 1 ? "" : "s"} in ${formatMonthLabel(month)}`
                : `${loadedCount} message${loadedCount === 1 ? "" : "s"} shown`}
        </p>
        {(month !== "" || debouncedQuery !== "") && (
          <button
            type="button"
            onClick={() => {
              setMonth("");
              setQuery("");
            }}
            className="text-green-700 hover:text-green-800 font-medium hover:underline underline-offset-2 transition-colors"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* ── Message list ── */}
      {initialLoading ? (
        <div className="space-y-4" aria-label="Loading messages">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-stone-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-800 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
          <p style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl text-stone-600">
            No messages found
          </p>
          <p className="mt-2 text-sm text-stone-400">
            {hasFilters
              ? "Try a different search or month."
              : "The first Sabbath message will appear here."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setMonth("");
                setQuery("");
              }}
              className="mt-5 rounded-xl border border-green-200 px-5 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-5">
            {messages.map((msg) => (
              <li key={msg.id}>
                <article className="group rounded-2xl border border-stone-100 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-green-200/60 transition-all duration-300">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-green-700/50 font-semibold mb-3">
                    {formatDateLabel(msg.sabbathDate)}
                  </p>
                  <div
                    style={{ fontFamily: "'Crimson Pro', serif" }}
                    className="text-stone-700 text-base sm:text-lg leading-[1.85] font-light whitespace-pre-wrap"
                  >
                    {linkify(msg.message)}
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {/* Sentinel for infinite scroll + accessible fallback */}
          <div ref={sentinelRef} className="pt-8 pb-2" aria-hidden="true" />

          {loadingMore && (
            <div className="flex justify-center py-6" aria-label="Loading more messages">
              <Loader2 className="w-5 h-5 text-green-700 animate-spin" />
            </div>
          )}

          {nextCursor && !loadingMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                type="button"
                onClick={() => fetchPage({ cursor: nextCursor })}
                className="rounded-xl border border-green-200 px-6 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
              >
                Load more
              </button>
            </div>
          )}

          {!nextCursor && (
            <p className="pt-4 pb-6 text-center text-xs text-stone-400">
              You have reached the beginning of the archives.
            </p>
          )}
        </>
      )}

      {/* ── Back to top ── */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-green-700 text-white shadow-lg shadow-green-900/20 hover:bg-green-800 transition-colors flex items-center justify-center"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
