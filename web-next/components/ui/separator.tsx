import * as React from 'react';
import { cn } from '@/lib/utils';

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-px w-full bg-[hsl(var(--border))]', className)} {...props} />;
}
