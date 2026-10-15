import { useCallback, useEffect, useEffectEvent, useState, type Dispatch, type SetStateAction } from 'react';
import { isAbortError } from '../api/client';

export interface Resource<T> {
  /** Last successfully loaded value; kept while the next key loads. */
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
  /** For optimistic updates of the loaded value. */
  setData: Dispatch<SetStateAction<T | undefined>>;
}

/**
 * The app's single data-loading hook. Loads whenever `key` changes (or on reload), aborts the
 * request a newer one supersedes, and never applies an out-of-date response.
 */
export function useResource<T>(key: string, load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T>();
  const [settled, setSettled] = useState<{ token: string; error?: Error }>({ token: '' });
  const token = `${key}#${version}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    const controller = new AbortController();
    run(controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setData(value);
        setSettled({ token });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setSettled({ token, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => controller.abort();
  }, [token]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = settled.token === token;
  return { data, error: current ? settled.error : undefined, loading: !current, reload, setData };
}
