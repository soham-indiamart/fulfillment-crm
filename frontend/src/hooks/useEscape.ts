import { useEffect, useEffectEvent } from 'react';

/** Calls `onEscape` when Escape is pressed, while `enabled`. Used by every dialog. */
export function useEscape(onEscape: () => void, enabled = true) {
  const handle = useEffectEvent(onEscape);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
