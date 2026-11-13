import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
      default: 'bg-amber-800 text-white hover:bg-amber-900 shadow-xs',
      outline:
        'border-2 border-amber-900/20 bg-white hover:bg-amber-50 text-amber-950',
      secondary: 'bg-amber-100 text-amber-950 hover:bg-amber-200',
      ghost: 'hover:bg-amber-100/70 text-amber-950',
      destructive: 'bg-red-700 text-white hover:bg-red-800',
    };

    const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
      default: 'min-h-[44px] px-4 py-2 text-sm',
      sm: 'min-h-[36px] px-3 text-xs',
      lg: 'min-h-[52px] px-6 text-base',
      icon: 'min-h-[44px] min-w-[44px]',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
