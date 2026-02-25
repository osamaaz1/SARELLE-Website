'use client';

interface TimelineEvent {
  status: string;
  label: string;
  date?: string;
  active?: boolean;
  completed?: boolean;
}

const STATUS_FLOW = [
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'paid', label: 'Payment Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'inspection_window', label: 'Inspection Window' },
  { key: 'completed', label: 'Completed' },
];

interface OrderStatusTimelineProps {
  currentStatus: string;
  events?: { to_status: string; created_at: string }[];
}

export function OrderStatusTimeline({ currentStatus, events = [] }: OrderStatusTimelineProps) {
  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  const eventMap = new Map(events.map((e) => [e.to_status, e.created_at]));

  return (
    <div className="space-y-0">
      {STATUS_FLOW.map((step, i) => {
        const completed = i <= currentIndex;
        const active = i === currentIndex;
        const date = eventMap.get(step.key);

        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1 ${
                active ? 'bg-wimc-green ring-2 ring-wimc-green/30' : completed ? 'bg-wimc-green' : 'bg-wimc-border'
              }`} />
              {i < STATUS_FLOW.length - 1 && (
                <div className={`w-0.5 h-8 ${completed ? 'bg-wimc-green/30' : 'bg-wimc-border'}`} />
              )}
            </div>
            <div className="pb-4">
              <p className={`text-sm font-medium ${active ? 'text-wimc-green' : completed ? 'text-white' : 'text-wimc-subtle'}`}>
                {step.label}
              </p>
              {date && <p className="text-xs text-wimc-subtle">{new Date(date).toLocaleDateString()}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
