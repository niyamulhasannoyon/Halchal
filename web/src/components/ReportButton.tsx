import React from 'react';

interface ReportButtonProps {
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function ReportButton({
  onClick,
  isLoading = false,
  disabled = false,
  className = '',
  label = 'আপনার এলাকার হাল জানান',
}: ReportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`w-full group relative flex items-center justify-center gap-3 px-6 py-3.5 min-h-[54px] rounded-2xl font-bengali font-bold text-base md:text-lg text-white shadow-lg transition-all duration-150 select-none cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:active:bg-emerald-700 ${className}`}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span className="text-xl leading-none" aria-hidden="true">
          📢
        </span>
      )}
      <span className="tracking-wide">{label}</span>
    </button>
  );
}
