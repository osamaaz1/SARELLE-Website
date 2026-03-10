interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-wimc-subtle mb-4">{icon}</div>}
      <h3 className="text-lg font-heading font-semibold text-wimc-muted mb-2">{title}</h3>
      {description && <p className="text-sm text-wimc-subtle max-w-md mb-6">{description}</p>}
      {action}
    </div>
  );
}
