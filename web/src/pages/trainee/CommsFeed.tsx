import React from 'react';
import { TraineeReport } from '@degrade/shared';
import { Badge } from '../../components/ui/Badge.js';
import { Radio, AlertCircle, Clock, MapPin } from 'lucide-react';

export interface CommsFeedProps {
  reports: TraineeReport[];
  selectedReportId?: number | null;
  onSelectReport: (report: TraineeReport) => void;
  className?: string;
}

export const CommsFeed: React.FC<CommsFeedProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  className = '',
}) => {
  // Visually group conflicting / related reports without revealing internal metadata
  const groupedReports: Array<{ titleGroup: string; items: TraineeReport[] }> = [];

  reports.forEach((rep) => {
    // Check if an existing group shares title similarity or coordinate proximity
    const titleKey = rep.payload.title.toLowerCase().split(' ')[0] || 'general';
    const existing = groupedReports.find(g =>
      g.items.some(item => {
        const itemTitleKey = item.payload.title.toLowerCase().split(' ')[0];
        const isClose = (rep.payload.lat && item.payload.lat &&
          Math.abs(rep.payload.lat - item.payload.lat) < 0.08 &&
          Math.abs(rep.payload.lon! - item.payload.lon!) < 0.08);
        return itemTitleKey === titleKey || isClose;
      })
    );

    if (existing) {
      existing.items.push(rep);
    } else {
      groupedReports.push({ titleGroup: rep.payload.title, items: [rep] });
    }
  });

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'CONFIRMED':
        return <Badge variant="success" size="sm">CONFIRMED</Badge>;
      case 'PROBABLE':
        return <Badge variant="warning" size="sm">PROBABLE</Badge>;
      case 'UNVERIFIED':
      default:
        return <Badge variant="danger" size="sm">UNVERIFIED</Badge>;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-surface border-l border-border ${className}`}>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-fg">
            Tactical Feed ({reports.length})
          </span>
        </div>
        <span className="text-[10px] text-muted font-mono">ENCRYPTED COMMS</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {reports.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted">
            <Radio className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Listening on tactical frequencies...
            <p className="text-[11px] mt-1 text-muted/70">Incoming scenario reports will appear here.</p>
          </div>
        ) : (
          groupedReports.map((group, gIdx) => {
            const hasMultiple = group.items.length > 1;
            return (
              <div
                key={gIdx}
                className={`rounded-card transition-all ${
                  hasMultiple ? 'border border-accent/40 bg-accent/5 p-2 space-y-2' : ''
                }`}
              >
                {hasMultiple && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-accent uppercase font-medium px-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Multiple Dispatches for Area of Interest</span>
                  </div>
                )}

                {group.items.map((rep) => {
                  const isSelected = selectedReportId === rep.id;
                  const timeStr = rep.delivered_at
                    ? new Date(rep.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Just now';

                  return (
                    <div
                      key={rep.id}
                      onClick={() => onSelectReport(rep)}
                      className={`p-3 rounded-control border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-surface-2 border-primary ring-1 ring-primary/40 shadow-sm'
                          : 'bg-surface border-border/80 hover:bg-surface-2/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-fg truncate">
                          {rep.payload.title}
                        </span>
                        {getConfidenceBadge(rep.confidence)}
                      </div>

                      {rep.payload.detail && (
                        <p className="text-muted text-[11px] leading-relaxed mb-2">
                          {rep.payload.detail}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] font-mono text-muted/80 pt-1 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted" />
                          <span>{timeStr}</span>
                        </div>
                        {rep.payload.lat && rep.payload.lon && (
                          <div className="flex items-center gap-1 text-primary">
                            <MapPin className="w-3 h-3" />
                            <span>
                              {rep.payload.lat.toFixed(3)}N, {rep.payload.lon.toFixed(3)}E
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
