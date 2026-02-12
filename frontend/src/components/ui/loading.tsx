import { cn } from '../../lib/utils';

interface LoadingProps {
  className?: string;
}

export function Loading({ className }: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <div className="flex gap-1">
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="h-4 w-1/3 rounded bg-muted shimmer" />
      <div className="h-8 w-1/2 rounded bg-muted shimmer" />
      <div className="h-3 w-2/3 rounded bg-muted shimmer" />
    </div>
  );
}

export function LoadingRow() {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="h-12 w-8 rounded bg-muted shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-muted shimmer" />
        <div className="h-3 w-1/4 rounded bg-muted shimmer" />
      </div>
    </div>
  );
}
