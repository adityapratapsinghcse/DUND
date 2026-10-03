import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 font-medium',
  }[size];

  const variantClasses = {
    default: 'bg-surface-2 text-muted border border-border/60',
    primary: 'bg-primary/15 text-primary border border-primary/25',
    accent: 'bg-accent/15 text-accent border border-accent/25',
    success: 'bg-success/15 text-success border border-success/25',
    warning: 'bg-warning/15 text-warning border border-warning/25',
    danger: 'bg-danger/15 text-danger border border-danger/25',
    info: 'bg-info/15 text-info border border-info/25',
  }[variant];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-chip leading-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
