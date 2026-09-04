"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppUser } from "@/context/UserContext";
import { pwaApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2 } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nurushop-pwa-dismissed";

const canUseDOM = typeof window !== "undefined";

const isStandaloneDisplay = () =>
  canUseDOM &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true);

const isIOSDevice = () => {
  if (!canUseDOM) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

export default function InstallPrompt() {
  const { user, isLoading } = useAppUser();
  const isAuthenticated = Boolean(user);

  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const showIOSInstructions = useMemo(
    () => isAuthenticated && !isStandalone && isIOSDevice() && !promptEvent,
    [isAuthenticated, isStandalone, promptEvent],
  );

  useEffect(() => {
    const updateStandalone = () => {
      setIsStandalone(isStandaloneDisplay());
    };
    updateStandalone();

    const media = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = () => updateStandalone();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleMediaChange);
    } else if (typeof media.addListener === "function") {
      media.addListener(handleMediaChange);
    }

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowPrompt(false);
      void pwaApi.record({ platform: window.navigator.platform || null }).catch(() => {});
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const handleVisibility = () => updateStandalone();

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("visibilitychange", handleVisibility);
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handleMediaChange);
      } else if (typeof media.removeListener === "function") {
        media.removeListener(handleMediaChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading || isStandalone) {
      setShowPrompt(false);
      return;
    }
    const dismissedAt = Number(sessionStorage.getItem(DISMISS_KEY) ?? 0);
    const dismissed = dismissedAt > 0;
    if (dismissed) {
      setShowPrompt(false);
      return;
    }

    if (promptEvent || showIOSInstructions) {
      setShowPrompt(true);
    }
  }, [isAuthenticated, isLoading, isStandalone, promptEvent, showIOSInstructions]);

  const handleInstall = () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    promptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        setIsStandalone(true);
        setShowPrompt(false);
      }
      setPromptEvent(null);
    });
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.3,
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md"
        >
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src="/icons/nurushop-icon-192.png"
                  alt="Nurushop Logo"
                  className="h-14 w-14 object-contain"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base leading-tight">
                  Install Nurushop
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  {showIOSInstructions ? (
                    <span className="flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5 text-[#009933]" />
                      Tap Share and then Add to Home Screen
                    </span>
                  ) : (
                    "Get the best shopping experience directly from your home screen"
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!showIOSInstructions && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInstall}
                    className="relative flex items-center gap-1.5 rounded-xl bg-[#009933] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-green-700/20 transition-colors hover:bg-[#006B2C]"
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Dismiss install prompt"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Progress indicator for iOS */}
            {showIOSInstructions && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="h-full rounded-full bg-[#009933]"
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Tip
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
