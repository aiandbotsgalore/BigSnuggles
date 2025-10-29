/**
 * Scroll Area Component
 * 
 * Simple scrollable area wrapper
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn('overflow-y-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
}
