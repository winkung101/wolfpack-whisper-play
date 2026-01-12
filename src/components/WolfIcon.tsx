import { cn } from '@/lib/utils';

interface WolfIconProps {
  className?: string;
  size?: number;
}

export const WolfIcon = ({ className, size = 24 }: WolfIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={cn(className)}
  >
    {/* Wolf head silhouette */}
    <path d="M4 14c0-4 3-8 8-8s8 4 8 8" />
    {/* Ears */}
    <path d="M5 8l-1-4 3 2" />
    <path d="M19 8l1-4-3 2" />
    {/* Eyes */}
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    {/* Snout */}
    <path d="M12 14v2" />
    <path d="M10 17c0 1 1 2 2 2s2-1 2-2" />
    {/* Fangs */}
    <path d="M10 19l-1 2" />
    <path d="M14 19l1 2" />
  </svg>
);
