import { useCallback, useState } from 'react';

/** A string remembered in this browser. Storage can be blocked (private mode); the value still works for the session. */
export function useLocalStorage(key: string, initial = ''): [string, (value: string) => void] {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Not persisted; the in-memory value is enough.
      }
    },
    [key],
  );

  return [value, update];
}
