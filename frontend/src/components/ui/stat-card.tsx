'use client';
import { Card } from './card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  color?: string;
}

export function StatCard({ label, value, icon, trend, color }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-wimc-subtle uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-heading font-bold mt-1" style={color ? { color } : {}}>
            {value}
          </p>
          {trend && <p className="text-xs text-wimc-green mt-1">{trend}</p>}
        </div>
        {icon && <div className="text-wimc-subtle">{icon}</div>}
      </div>
    </Card>
  );
}
