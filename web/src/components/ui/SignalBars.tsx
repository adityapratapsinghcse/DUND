import React from 'react';

export interface SignalBarsProps {
  bars: number; // 0 to 4
  quality?: number; // 0.0 to 1.0
  showLabel?: boolean;
  className?: string;
}

export const SignalBars: React.FC<SignalBarsProps> = ({
  bars,
  quality,
  showLabel = true,
  className = '',
}) => {
  const safeBars = Math.max(0, Math.min(4, Math.round(bars)));

  const getBarColor = (index: number) => {
    if (index >= safeBars) {
      return 'bg-border/60';
    }
    if (safeBars === 4) return 'bg-success';
    if (safeBars === 3) return 'bg-success';
    if (safeBars === 2) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex items-end gap-1 h-5 w-6 pb-0.5" title={`Link quality: ${safeBars}/4 bars`}>
        {[0, 1, 2, 3].map((idx) => {
          const heightClass = ['h-1.5', 'h-2.5', 'h-3.5', 'h-4.5'][idx];
          return (
            <div
              key={idx}
              className={`w-1 rounded-sm transition-all duration-300 ${heightClass} ${getBarColor(idx)}`}
            />
          );
        })}
      </div>
      {showLabel && (
        safeBars === 0 ? (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-chip bg-danger/15 text-danger border border-danger/30 animate-pulse">
            COMMS LOST
          </span>
        ) : (
          <span className="font-mono text-xs text-muted">
            {safeBars}/4 BARS {quality !== undefined && `(${Math.round(quality * 100)}%)`}
          </span>
        )
      )}
    </div>
  );
};
