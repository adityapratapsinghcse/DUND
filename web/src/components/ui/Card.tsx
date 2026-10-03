import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-surface border border-border/80 shadow-subtle',
    raised: 'bg-surface-2 border border-border shadow-subtle',
    bordered: 'bg-surface border-2 border-border',
  }[variant];

  return (
    <div
      className={`rounded-card p-5 text-fg ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
