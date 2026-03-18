interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-surface-100 text-surface-600 border border-surface-200',
  success: 'bg-success-50 text-success-700 border border-success-200',
  warning: 'bg-warning-50 text-warning-600 border border-warning-100',
  danger: 'bg-danger-50 text-danger-600 border border-danger-200',
  info: 'bg-info-50 text-info-600 border border-info-100',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span role="status" className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function priorityBadge(priority: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    critical: { variant: 'danger', label: 'Critical' },
    high: { variant: 'warning', label: 'High' },
    medium: { variant: 'info', label: 'Medium' },
    low: { variant: 'success', label: 'Low' },
  };
  const config = map[priority] || { variant: 'default', label: priority };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function statusBadge(status: string) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    open: { variant: 'warning', label: 'Open' },
    investigating: { variant: 'info', label: 'Investigating' },
    resolved: { variant: 'success', label: 'Resolved' },
    closed: { variant: 'default', label: 'Closed' },
    pending: { variant: 'warning', label: 'Pending' },
    in_progress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'success', label: 'Completed' },
    approved: { variant: 'success', label: 'Approved' },
    review_required: { variant: 'warning', label: 'Review Required' },
  };
  const config = map[status] || { variant: 'default', label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
