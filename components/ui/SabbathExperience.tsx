"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSabbathStatus } from "@/lib/useSabbathStatus";

/* ─────────────────────── types ─────────────────────── */
type SabbathMessage = {
  id: string;
  message: string;
  sabbathDate: string;
  createdAt?: string | null;
};

type HistoryCursor = {
  sabbathDate: string;
  createdAt: string | null;
};

type HistoryPage = {
  messages: SabbathMessage[];
  nextCursor: HistoryCursor | null;
};

/* ─────────────────────── constants ─────────────────────── */
const COUNTDOWN_THRESHOLD_MS = 3 * 60 * 60 * 1000;
const HISTORY_LIMIT = 5;
const URL_REGEX = /https?:\/\/[^\s]+/g;

/* ─────────────────────── helpers ─────────────────────── */
const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
};

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Sabbath is stored as the Friday date, but we always display Saturday.
 * If the date is a Friday (day=5), advance by 1 day to Saturday.
 */
const toSaturdayDateString = (value: string): string => {
  if (!value) return value;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  if (date.getDay() === 5) date.setDate(date.getDate() + 1);
  return toDateString(date);
};

const formatDateLabel = (value: string) => {
  if (!value) return "";
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

/**
 * Returns true only for sabbaths that are strictly in the past
 * (not the current sabbath, not future).
 */
const isStrictlyPastSabbath = (sabbathDate: string, currentSabbathDate: string): boolean => {
  if (sabbathDate === currentSabbathDate) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const saturday = toSaturdayDateString(sabbathDate);
  const msgDate = new Date(`${saturday}T00:00:00`);
  return msgDate < today;
};

const linkify = (text: string) => {
  if (!text) return null;
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
        className="underline decoration-amber-500/60 hover:decoration-amber-600 text-amber-700 hover:text-amber-800 transition-colors"
      >
        {url}
      </a>
    );
    lastIndex = index + url.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
};

/* ─────────────────────── Bible Animation ─────────────────────── */
function BibleAnimation() {
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        delay: i * 0.4,
        x: 18 + i * 10,
      })),
    []
  );

  return (
    <div className="relative flex items-center justify-center w-20 h-24 mx-auto select-none">
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ background: "radial-gradient(ellipse, #f7c97e33 0%, transparent 70%)" }}
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Spine */}
      <div
        className="absolute left-1/2 -translate-x-px bottom-1 w-0.5 h-[52px] rounded-full"
        style={{ background: "linear-gradient(to bottom, #92400e88, #92400e22)" }}
      />

      {/* Left cover */}
      <motion.div
        className="absolute bottom-1 left-1/2 origin-right rounded-l-sm"
        style={{
          width: 34,
          height: 50,
          marginLeft: -34,
          background: "linear-gradient(135deg, #7c2d12 0%, #92400e 40%, #b45309 100%)",
          boxShadow: "-2px 2px 8px #00000044",
        }}
        animate={{ rotateY: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Embossed cross */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-4 h-5">
            <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-amber-400/40 rounded-full" />
            <div className="absolute top-[35%] left-0 right-0 h-px bg-amber-400/40 rounded-full" />
          </div>
        </div>
        <div className="absolute right-0 top-1 bottom-1 w-px bg-amber-400/30" />
      </motion.div>

      {/* Right cover */}
      <motion.div
        className="absolute bottom-1 left-1/2 origin-left rounded-r-sm"
        style={{
          width: 34,
          height: 50,
          background: "linear-gradient(225deg, #7c2d12 0%, #92400e 40%, #b45309 100%)",
          boxShadow: "2px 2px 8px #00000044",
        }}
        animate={{ rotateY: [0, 8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute left-0 top-1 bottom-1 w-px bg-amber-400/30" />
      </motion.div>

      {/* Pages — right side */}
      <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2" style={{ width: 60, height: 46, zIndex: 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 left-1/2"
            style={{
              width: 28 - i * 1.5,
              height: 44 - i * 0.5,
              background: i === 0 ? "#fdf8f0" : "#fef3e2",
              borderRadius: "0 1px 1px 0",
              transformOrigin: "left center",
              zIndex: 4 - i,
            }}
            animate={{
              rotateY: i === 0 ? [0, 12, 0] : [0, i * 3, 0],
              x: i === 0 ? [0, 3, 0] : [0, i * 1.5, 0],
            }}
            transition={{ duration: 4, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
          >
            {i === 0 &&
              [0, 1, 2, 3, 4].map((line) => (
                <div
                  key={line}
                  className="absolute left-2 right-1 h-px rounded-full"
                  style={{ top: 8 + line * 7, background: "#92400e18" }}
                />
              ))}
          </motion.div>
        ))}

        {/* Pages — left side */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={`l-${i}`}
            className="absolute bottom-0 right-1/2"
            style={{
              width: 28 - i * 1.5,
              height: 44 - i * 0.5,
              background: i === 0 ? "#fdf8f0" : "#fef3e2",
              borderRadius: "1px 0 0 1px",
              transformOrigin: "right center",
              zIndex: 4 - i,
            }}
            animate={{
              rotateY: i === 0 ? [0, -12, 0] : [0, -i * 3, 0],
              x: i === 0 ? [0, -3, 0] : [0, -i * 1.5, 0],
            }}
            transition={{ duration: 4, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
          >
            {i === 0 &&
              [0, 1, 2, 3, 4].map((line) => (
                <div
                  key={line}
                  className="absolute left-1 right-2 h-px rounded-full"
                  style={{ top: 8 + line * 7, background: "#92400e18" }}
                />
              ))}
          </motion.div>
        ))}
      </div>

      {/* Rising light particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full"
          style={{ background: "#f7c97e", left: `${p.x}%`, bottom: "60%", filter: "blur(0.5px)" }}
          animate={{ y: [0, -18, -32], opacity: [0, 0.8, 0], scale: [0.5, 1, 0.3] }}
          transition={{ duration: 2.2, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────── StarField ─────────────────────── */
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 60,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 2,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-amber-100"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────── CountdownUnit ─────────────────────── */
function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #2d1b0e 0%, #1a0f07 100%)",
          boxShadow: "0 0 24px #f7c97e22, inset 0 1px 0 #f7c97e33",
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-2xl sm:text-3xl font-mono text-amber-200 tabular-nums"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-700/70 font-medium">
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────── Main Component ─────────────────────── */
export default function SabbathExperience() {
  const { isClosed, msToStart, start } = useSabbathStatus({ intervalMs: 1000 });
  const showCountdown = !isClosed && msToStart > 0 && msToStart <= COUNTDOWN_THRESHOLD_MS;

  // sabbathDate is the raw date from useSabbathStatus (may be Friday)
  const sabbathDate = useMemo(() => (isClosed ? toDateString(start) : ""), [isClosed, start]);

  const [currentMessage, setCurrentMessage] = useState<SabbathMessage | null>(null);
  const [historyPages, setHistoryPages] = useState<HistoryPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isClosed) {
      setCurrentMessage(null);
      setHistoryPages([]);
      setPageIndex(0);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/sabbath-messages?date=${encodeURIComponent(sabbathDate)}&limit=${HISTORY_LIMIT}`,
          { cache: "no-store", signal: controller.signal }
        );
        const payload = (await res.json().catch(() => ({}))) as {
          currentMessage?: SabbathMessage | null;
          messages?: SabbathMessage[];
          nextCursor?: HistoryCursor | null;
        };
        if (!res.ok) return;
        setCurrentMessage(payload.currentMessage ?? null);

        // Only keep strictly past sabbaths (not current, not future)
        const pastOnly = (payload.messages ?? []).filter((m) =>
          isStrictlyPastSabbath(m.sabbathDate, sabbathDate)
        );
        setHistoryPages([{ messages: pastOnly, nextCursor: payload.nextCursor ?? null }]);
        setPageIndex(0);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setHistoryLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [isClosed, sabbathDate]);

  const currentPage = historyPages[pageIndex];
  const hasPrev = pageIndex > 0;
  const hasNext = Boolean(currentPage?.nextCursor?.createdAt);
  const historyMessages = currentPage?.messages ?? [];
  const hasHistory = historyMessages.length > 0;

  const handleNext = async () => {
    if (!currentPage?.nextCursor?.createdAt || historyLoading) return;
    if (pageIndex < historyPages.length - 1) { setPageIndex((i) => i + 1); return; }
    setHistoryLoading(true);
    try {
      const cursor = currentPage.nextCursor;
      const res = await fetch(
        `/api/sabbath-messages?limit=${HISTORY_LIMIT}&cursorDate=${encodeURIComponent(
          cursor.sabbathDate
        )}&cursorCreatedAt=${encodeURIComponent(cursor.createdAt ?? "")}`,
        { cache: "no-store" }
      );
      const payload = (await res.json().catch(() => ({}))) as {
        messages?: SabbathMessage[];
        nextCursor?: HistoryCursor | null;
      };
      if (!res.ok) return;
      const pastOnly = (payload.messages ?? []).filter((m) =>
        isStrictlyPastSabbath(m.sabbathDate, sabbathDate)
      );
      setHistoryPages((p) => [...p, { messages: pastOnly, nextCursor: payload.nextCursor ?? null }]);
      setPageIndex((i) => i + 1);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePrev = () => {
    if (hasPrev && !historyLoading) setPageIndex((i) => Math.max(0, i - 1));
  };

  if (!isClosed && !showCountdown) return null;

  /* ── COUNTDOWN ── */
  if (showCountdown) {
    const { hours, minutes, seconds } = formatCountdown(msToStart);
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Crimson+Pro:wght@300;400&display=swap');`}</style>
        <section className="mx-auto max-w-3xl px-2 py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
            style={{
              background: "linear-gradient(160deg, #1a0f07 0%, #2d1b0e 50%, #1f1208 100%)",
              boxShadow: "0 24px 64px #00000066, 0 0 0 1px #f7c97e22",
            }}
          >
            <StarField />
            <div className="relative z-10 flex flex-col items-center gap-8 text-center">
              <BibleAnimation />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-500/80 font-medium mb-2">
                  Sabbath Begins Soon
                </p>
                <h2
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-2xl sm:text-3xl text-amber-100 font-normal"
                >
                  Our shop rests for the Sabbath
                </h2>
                <p
                  style={{ fontFamily: "'Crimson Pro', serif" }}
                  className="mt-2 text-amber-300/60 text-lg font-light"
                >
                  From Friday sunset to Saturday sunset
                </p>
              </div>
              <div className="flex items-end gap-3">
                <CountdownUnit value={hours} label="hours" />
                <span className="text-3xl text-amber-600/60 font-light mb-6">:</span>
                <CountdownUnit value={minutes} label="minutes" />
                <span className="text-3xl text-amber-600/60 font-light mb-6">:</span>
                <CountdownUnit value={seconds} label="seconds" />
              </div>
              <p
                style={{ fontFamily: "'Crimson Pro', serif" }}
                className="text-amber-200/50 text-base italic font-light max-w-xs"
              >
                Kindly shop now and Take a moment to rest. We&apos;ll be back.
              </p>
            </div>
          </motion.div>
        </section>
      </>
    );
  }

  /* ── SABBATH ACTIVE ── */
  const messageText = currentMessage?.message?.trim() ?? "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');

        .sabbath-drop-cap::first-letter {
          font-family: 'Playfair Display', serif;
          font-size: 3.8em;
          line-height: 0.75;
          float: left;
          margin-right: 0.08em;
          margin-top: 0.08em;
          color: #92400e;
          font-weight: 600;
        }

        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 32px #f7c97e0a, 0 0 0 1px #f7c97e18; }
          50%       { box-shadow: 0 0 48px #f7c97e1a, 0 0 0 1px #f7c97e2a; }
        }
        .sabbath-glow { animation: breathe 5s ease-in-out infinite; }
      `}</style>

      <section className="mx-auto max-w-3xl px-4 py-8 space-y-6">

        {/* ── Hero Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl sabbath-glow"
          style={{
            background: "linear-gradient(160deg, #1a0f07 0%, #2d1b0e 45%, #1f130a 100%)",
            boxShadow: "0 20px 60px #00000055, 0 0 0 1px #f7c97e18",
          }}
        >
          <StarField />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
            style={{ background: "linear-gradient(to right, transparent, #f7c97e44, transparent)" }}
          />

          <div className="relative z-10 px-8 sm:px-12 py-10 flex flex-col sm:flex-row sm:items-center gap-8">
            <div className="flex-shrink-0 flex justify-center">
              <BibleAnimation />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-500/70 font-medium mb-2">
                Shabbat Shalom
              </p>
              <h2
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-2xl sm:text-3xl text-amber-100 font-semibold leading-snug"
              >
                Our shop is at rest
              </h2>
              <p
                style={{ fontFamily: "'Crimson Pro', serif" }}
                className="mt-2 text-amber-300/60 text-base sm:text-lg font-light leading-relaxed"
              >
                Friday sunset to Saturday sunset — we observe the Sabbath. Regular shopping resumes
                when the sabbath is ended.
              </p>
            </div>
          </div>

          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
            style={{ background: "linear-gradient(to right, transparent, #f7c97e22, transparent)" }}
          />
        </motion.div>

        {/* ── Today's Message (always shows Saturday date) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl overflow-hidden border"
          style={{
            borderColor: "#f7c97e22",
            background: "linear-gradient(180deg, #fffdf5 0%, #fdf8ec 100%)",
          }}
        >
          <div className="px-8 sm:px-10 pt-7 pb-5 border-b" style={{ borderColor: "#f0e0b433" }}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-700/50 font-semibold mb-1">
              Today&apos;s Message
            </p>
            {/* formatDateLabel handles the Friday→Saturday shift internally */}
            <h3
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-xl sm:text-2xl text-stone-800 font-normal italic"
            >
              {formatDateLabel(sabbathDate)}
            </h3>
          </div>

          <div className="px-3 sm:px-10 py-5">
            {loading ? (
              <div className="space-y-3">
                {[4, 3, 5, 2, 4].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 rounded-full bg-amber-100 animate-pulse"
                    style={{ width: `${w * 13}%`, animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            ) : messageText ? (
              <div
                style={{ fontFamily: "'Crimson Pro', serif" }}
                className="sabbath-drop-cap text-stone-700 text-lg sm:text-xl leading-[1.85] font-light whitespace-pre-wrap"
              >
                {linkify(messageText)}
              </div>
            ) : (
              <p
                style={{ fontFamily: "'Crimson Pro', serif" }}
                className="text-stone-400 text-lg italic font-light text-center py-4"
              >
                No message has been added for today.
              </p>
            )}
          </div>

          <div className="mx-8 sm:mx-10 mb-6 flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ background: "linear-gradient(to right, transparent, #e8c98066)" }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-300/60" />
            <div
              className="flex-1 h-px"
              style={{ background: "linear-gradient(to left, transparent, #e8c98066)" }}
            />
          </div>
        </motion.div>

        {/* ── Archive — only shown when strictly past messages exist ── */}
        <AnimatePresence>
          {(hasHistory || historyLoading) && (
            <motion.div
              ref={historyRef}
              key="history"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl overflow-hidden border"
              style={{ borderColor: "#e2d5c444", background: "#fafaf8" }}
            >
              <div
                className="px-3 sm:px-3 pt-7 pb-4 border-b flex items-start justify-between gap-4"
                style={{ borderColor: "#e8dcc866" }}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-semibold mb-1">
                    Archive
                  </p>
                  <h3
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    className="text-xl text-stone-700 font-normal"
                  >
                    Past Sabbath Messages
                  </h3>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!hasPrev || historyLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 border border-stone-200 hover:bg-stone-50 hover:text-stone-700 disabled:opacity-30 transition-all"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M10 12L6 8l4-4" />
                    </svg>
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasNext || historyLoading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 border border-stone-200 hover:bg-stone-50 hover:text-stone-700 disabled:opacity-30 transition-all"
                  >
                    Next
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-2 sm:px-5 py-6 space-y-5">
                {historyLoading && historyMessages.length === 0 && (
                  <div className="space-y-3 py-2">
                    {[3, 5, 4, 2].map((w, i) => (
                      <div
                        key={i}
                        className="h-3 rounded-full bg-stone-100 animate-pulse"
                        style={{ width: `${w * 14}%`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={pageIndex}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {historyMessages.map((msg, idx) => (
                      <motion.article
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.06 }}
                        className="group rounded-2xl border p-5 sm:p-6 hover:border-amber-200/60 hover:bg-amber-50/40 transition-all duration-300"
                        style={{ borderColor: "#e8dcc877", background: "#fdfcf9" }}
                      >
                        {/* Each past message also shows its Saturday date */}
                        <p className="text-[10px] uppercase tracking-[0.25em] text-amber-700/50 font-semibold mb-2">
                          {formatDateLabel(msg.sabbathDate)}
                        </p>
                        <div
                          style={{ fontFamily: "'Crimson Pro', serif" }}
                          className="text-stone-600 text-base sm:text-lg leading-[1.8] font-light whitespace-pre-wrap"
                        >
                          {linkify(msg.message)}
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </section>
    </>
  );
}