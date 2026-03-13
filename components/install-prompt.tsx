"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppUser } from "@/context/UserContext";

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALLED_KEY = "nurushop-installed";

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
  const [isInstalled, setIsInstalled] = useState(false);

  const showIOSInstructions = useMemo(
    () => isAuthenticated && !isInstalled && isIOSDevice() && !promptEvent,
    [isAuthenticated, isInstalled, promptEvent]
  );

  useEffect(() => {
    const storedInstalled = localStorage.getItem(INSTALLED_KEY) === "true";
    const currentlyInstalled = isStandaloneDisplay() || storedInstalled;
    if (currentlyInstalled) {
      localStorage.setItem(INSTALLED_KEY, "true");
      setIsInstalled(true);
      setShowPrompt(false);
    }

    const handleAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setIsInstalled(true);
      setShowPrompt(false);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (localStorage.getItem(INSTALLED_KEY) === "true") return;
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLoading || isInstalled) {
      setShowPrompt(false);
      return;
    }
    if (promptEvent) {
      setShowPrompt(true);
    } else if (showIOSInstructions) {
      setShowPrompt(true);
    }
  }, [isAuthenticated, isLoading, isInstalled, promptEvent, showIOSInstructions]);

  const handleInstall = () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    promptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        localStorage.setItem(INSTALLED_KEY, "true");
        setIsInstalled(true);
        setShowPrompt(false);
      }
      setPromptEvent(null);
    });
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-xl p-4 flex items-center space-x-4 z-50 max-w-md w-[90%]">
      <img
        src="/icons/icon-192.png"
        alt="Nurushop Logo"
        className="w-12 h-12 rounded"
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
          className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition"
        >
          Install
        </button>
      )}
    </div>
  );
}
