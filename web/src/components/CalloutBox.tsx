import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export type CalloutVariant = 'warning' | 'danger' | 'info' | 'success';

interface CalloutBoxProps {
  title?: string;
  variant?: CalloutVariant;
  children: React.ReactNode;
  className?: string;
}

export function CalloutBox({
  title,
  variant = 'info',
  children,
  className = '',
}: CalloutBoxProps) {
  const config = {
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
      titleColor: 'text-amber-400',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />,
    },
    danger: {
      bg: 'bg-red-500/10 border-red-500/30 text-red-200',
      titleColor: 'text-red-400',
      icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />,
    },
    info: {
      bg: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
      titleColor: 'text-blue-400',
      icon: <Info className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />,
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
      titleColor: 'text-emerald-400',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />,
    },
  }[variant];

  return (
    <aside
      className={`p-4 rounded-2xl border text-xs font-bengali space-y-1.5 ${config.bg} ${className}`}
    >
      {title && (
        <div className={`flex items-center gap-2 font-bold text-sm ${config.titleColor}`}>
          {config.icon}
          <h3>{title}</h3>
        </div>
      )}
      <div className="leading-relaxed space-y-1 opacity-90">{children}</div>
    </aside>
  );
}
