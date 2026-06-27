"use client";

import React, { useEffect, useState } from "react";
import { X, Bell, CheckCircle, AlertCircle, Info, MessageSquare } from "lucide-react";
import type { MessageType } from "../types";

interface MessageToastProps {
  message: MessageType;
  onDismiss: () => void;
  showFor?: number;
}

export default function MessageToast({ 
  message, 
  onDismiss, 
  showFor = 5000 
}: MessageToastProps) {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    
    const totalTime = showFor;
    const interval = 50; // Update every 50ms
    const steps = totalTime / interval;
    const decrement = 100 / steps;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [showFor, onDismiss, isHovered]);

  const getIcon = () => {
    switch (message.type) {
      case "success":
        return <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />;
      case "error":
        return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
      case "info":
        return <Info size={20} className="text-blue-600 dark:text-blue-400" />;
      case "message":
        return <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />;
      default:
        return <Bell size={20} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBgColor = () => {
    switch (message.type) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800";
      case "error":
        return "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
      case "message":
        return "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700";
    }
  };

  const getTextColor = () => {
    switch (message.type) {
      case "success":
        return "text-emerald-800 dark:text-emerald-200";
      case "error":
        return "text-red-800 dark:text-red-200";
      case "info":
        return "text-blue-800 dark:text-blue-200";
      case "message":
        return "text-blue-800 dark:text-blue-200";
      default:
        return "text-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div
      role="alert"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-xl border p-4 shadow-lg transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden ${getBgColor()} ${getTextColor()}`}
      style={{ minWidth: "300px", maxWidth: "400px" }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className={`h-full transition-all duration-300 ${
            message.type === "success" ? "bg-emerald-500" :
            message.type === "error" ? "bg-red-500" :
            message.type === "info" ? "bg-blue-500" :
            "bg-gray-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3 pt-1">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                {message.title || 
                  (message.type === "success" ? "Success" :
                   message.type === "error" ? "Error" :
                   message.type === "info" ? "Info" : "Message")}
              </h4>
              <p className="text-sm opacity-90">{message.text}</p>
              
              {message.action && (
                <button
                  onClick={message.action.onClick}
                  className={`mt-2 text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                    message.type === "success" 
                      ? "bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300" 
                      : message.type === "error"
                      ? "bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 text-red-700 dark:text-red-300"
                      : "bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  {message.action.label}
                </button>
              )}
            </div>
            
            <button
              type="button"
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-2"
              aria-label="Dismiss notification"
            >
              <X size={18} />
            </button>
          </div>
          
          {message.timestamp && (
            <div className="mt-2 text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}