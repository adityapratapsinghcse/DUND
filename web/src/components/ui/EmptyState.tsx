import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-card border border-dashed border-border bg-surface/50 ${className}`}>
      {icon && <div className="mb-3 text-muted/80">{icon}</div>}
      <h4 className="text-sm font-medium text-fg">{title}</h4>
      {description && <p className="mt-1 text-xs text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse rounded-control bg-border/40 ${className}`} />
  );
};
