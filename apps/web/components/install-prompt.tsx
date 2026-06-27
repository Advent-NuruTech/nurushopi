"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppUser } from "@/context/UserContext";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nurushop-pwa-dismissed";
const REPORT_KEY = "nurushop-pwa-install-reported";

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

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !isStandalone) return;
    if (sessionStorage.getItem(REPORT_KEY) === "true") return;
    sessionStorage.setItem(REPORT_KEY, "true");

    setDoc(
      doc(db, "users", user.id),
      {
        pwaInstalled: true,
        pwaInstalledAt: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {
      // ignore install report errors
    });
  }, [isAuthenticated, isStandalone, user?.id]);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-xl p-4 flex items-center space-x-4 z-50 max-w-md w-[90%]">
      <img
        src="/icons/icon-192.png"
        alt="Nurushop Logo"
        className="w-12 h-12 rounded-lg"
      />
      <div className="flex-1">
        <p className="font-medium text-gray-800">Install Nurushop</p>
        <p className="text-sm text-gray-500">
          {showIOSInstructions
            ? "Tap Share and then Add to Home Screen to install."
            : "Get the best shopping experience directly from your home screen."}
        </p>
      </div>
      {!showIOSInstructions && (
        <button
          onClick={handleInstall}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          Install
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="text-sm text-gray-400 hover:text-gray-600 transition"
        aria-label="Dismiss install prompt"
      >
        ×
      </button>
    </div>
  );
}
