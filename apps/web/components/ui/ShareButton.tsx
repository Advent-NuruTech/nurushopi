"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Share2, X } from "lucide-react";
import { FaFacebookF, FaLinkedinIn, FaWhatsapp, FaXTwitter } from "react-icons/fa6";

import { shareDescription, shareMessage } from "@/lib/share";

interface ShareButtonProps {
  title: string;
  description?: string | null;
  href: string;
  className?: string;
}

function absoluteUrl(href: string): string {
  return new URL(href, window.location.origin).toString();
}

function openShareWindow(url: string) {
  window.open(url, "nuru-social-share", "popup=yes,width=720,height=640,noopener,noreferrer");
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function ShareButton({
  title,
  description,
  href,
  className = "",
}: ShareButtonProps) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!fallbackOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFallbackOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [fallbackOpen]);

  const url = typeof window === "undefined" ? href : absoluteUrl(href);
  const conciseDescription = shareDescription(description, `Discover ${title} at NuruShop.`);
  const text = shareMessage(title, conciseDescription);

  const handleShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setFallbackOpen(true);
  };

  const copyShare = async () => {
    await copyText(`${text}\n${url}`);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      setFallbackOpen(false);
    }, 900);
  };

  const stopCardNavigation = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void handleShare();
  };

  return (
    <>
      <button
        type="button"
        onClick={stopCardNavigation}
        aria-label={`Share ${title}`}
        title={`Share ${title}`}
        className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition hover:border-brand hover:bg-brand-surface hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:border-brand-bright dark:hover:bg-[#063D1E] dark:hover:text-brand-bright ${className}`}
      >
        <Share2 size={17} aria-hidden="true" />
      </button>

      {fallbackOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setFallbackOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Share ${title}`}
              className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
                    Send to
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">
                    {title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFallbackOpen(false)}
                  aria-label="Close sharing options"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2">
                <button
                  type="button"
                  aria-label="Share on WhatsApp"
                  title="WhatsApp"
                  onClick={() =>
                    openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`)
                  }
                  className="grid aspect-square place-items-center rounded-2xl bg-[#DDFBE5] text-[#009933] transition hover:bg-[#B8F5C8]"
                >
                  <FaWhatsapp size={21} />
                </button>
                <button
                  type="button"
                  aria-label="Share on Facebook"
                  title="Facebook"
                  onClick={() =>
                    openShareWindow(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                    )
                  }
                  className="grid aspect-square place-items-center rounded-2xl bg-slate-100 text-[#1877F2] transition hover:bg-slate-200 dark:bg-slate-800"
                >
                  <FaFacebookF size={19} />
                </button>
                <button
                  type="button"
                  aria-label="Share on LinkedIn"
                  title="LinkedIn"
                  onClick={() =>
                    openShareWindow(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
                    )
                  }
                  className="grid aspect-square place-items-center rounded-2xl bg-slate-100 text-[#0A66C2] transition hover:bg-slate-200 dark:bg-slate-800"
                >
                  <FaLinkedinIn size={19} />
                </button>
                <button
                  type="button"
                  aria-label="Share on X"
                  title="X"
                  onClick={() =>
                    openShareWindow(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                    )
                  }
                  className="grid aspect-square place-items-center rounded-2xl bg-slate-100 text-slate-950 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-white"
                >
                  <FaXTwitter size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Copy sharing link"
                  title="Copy link"
                  onClick={() => void copyShare()}
                  className="grid aspect-square place-items-center rounded-2xl bg-brand-surface text-brand-strong transition hover:bg-brand-surface-strong dark:bg-[#063D1E] dark:text-brand-bright"
                >
                  {copied ? <Check size={20} /> : <Copy size={19} />}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
