import { clsx, type ClassValue } from 'clsx';
import { ConvexError } from 'convex/values';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pull the clean user-facing text out of a thrown error. ConvexError on the
// client exposes the original payload on `.data`, while `.message` is wrapped
// with server framing like "[CONVEX M(...)] Server Error\nUncaught ...".
//
// Recognized payload shapes on `ConvexError.data`:
//   - string                                       → returned as-is
//   - { message: string }                          → message returned
//   - { issues: [{ message: string }, ...] }       → first issue's message
//     (ZodError-shaped payloads thrown from server-side validators)
export function getErrorMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof ConvexError) {
    const data = e.data as unknown;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.message === 'string') return obj.message;
      if (Array.isArray(obj.issues) && obj.issues.length > 0) {
        const first = obj.issues[0] as { message?: unknown };
        if (typeof first.message === 'string') return first.message;
      }
    }
  }
  if (e instanceof Error) {
    const match = e.message.match(/Uncaught (?:Convex)?Error:\s*(.+?)(?:\n|$)/);
    if (match) return match[1].trim();
    return e.message.split('\n')[0];
  }
  return fallback;
}
