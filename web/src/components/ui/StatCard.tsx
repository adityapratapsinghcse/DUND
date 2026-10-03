import React from 'react';
import { Card } from './Card.js';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
}) => {
  return (
    <Card className={`flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between text-muted text-xs font-medium uppercase tracking-wider">
        <span>{title}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="mt-3">
        <div className="font-mono text-2xl font-semibold text-fg tracking-tight">{value}</div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            {trend && (
              <span className={`font-medium ${trend.positive ? 'text-success' : 'text-danger'}`}>
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </Card>
  );
};
