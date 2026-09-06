"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function AuthCard({ children, title, subtitle, icon }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_50px_rgb(15_23_42_/_12%)] ring-1 ring-slate-200">
        <div className="p-6 sm:p-8">
          {title || subtitle || icon ? (
            <div className="mb-4 flex items-center gap-3">
              {icon ? <div className="rounded-xl bg-[#EFFCF3] p-2 text-[#006B2C]">{icon}</div> : null}
              <div>
                {title ? <h2 className="text-2xl font-bold text-slate-900">{title}</h2> : null}
                {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
              </div>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </motion.div>
  );
}
