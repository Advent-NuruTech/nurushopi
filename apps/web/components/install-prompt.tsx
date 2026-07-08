"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppUser } from "@/context/UserContext";
import { pwaApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Smartphone, Share2 } from "lucide-react";

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
  const [isHovered, setIsHovered] = useState(false);

  const showIOSInstructions = useMemo(
    () => isAuthenticated && !isStandalone && isIOSDevice() && !promptEvent,
    [isAuthenticated, isStandalone, promptEvent]
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
            duration: 0.3
          }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-100/50 p-5 overflow-hidden">
            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            
            <div className="flex items-start gap-4">
              {/* App Icon with glow */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-xl" />
                <img
                  src="/icons/icon-192.png"
                  alt="Nurushop Logo"
                  className="relative w-14 h-14 rounded-xl shadow-lg ring-2 ring-white/50"
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
                      <Share2 className="w-3.5 h-3.5 text-blue-500" />
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
                    className="relative group flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
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
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Tip
                </span>
              </div>
            )}

            {/* Decorative dots */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/5 rounded-full blur-2xl" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}