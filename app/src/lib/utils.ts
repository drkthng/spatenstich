// Class-name composition helper for NativeWind 4.1.23.
// Pattern: react-native-reusables / shadcn-ui canonical helper (clsx + twMerge).
// Used by all UI primitives under src/components/ui/.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
