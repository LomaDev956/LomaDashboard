import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function LomaDevLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 40"
      aria-label="LOMA.DEV Logo"
      className={cn("h-6 w-auto", className)}
      {...props}
    >
      <text
        x="0"
        y="32"
        className="font-sans text-[38px] font-black tracking-tighter"
      >
        <tspan fill="currentColor" className="opacity-90">{'</'}</tspan>
        <tspan fill="hsl(var(--destructive))">LOMA</tspan>
        <tspan fill="currentColor" className="opacity-90">{'.DEV>'}</tspan>
      </text>
    </svg>
  );
}
