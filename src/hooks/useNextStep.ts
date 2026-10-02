import { useState, useRef, useEffect, useCallback } from 'react';

const KEY = 'meridian-auto-next';

export function useNextStep() {
  const [autoNext, setAutoNextState] = useState(() => {
    try { return localStorage.getItem(KEY) !== 'false'; }
    catch { return true; }
  });
  const [nextAction, setNextAction] = useState<(() => void) | null>(null);
  const autoNextRef = useRef(autoNext);
  const nextActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    autoNextRef.current = autoNext;
    nextActionRef.current = nextAction;
  }, [autoNext, nextAction]);

  const schedule = useCallback((delay: number, cb: () => void) => {
    if (autoNextRef.current) setTimeout(cb, delay);
    else setNextAction(() => cb);
  }, []);

  const reset = useCallback(() => setNextAction(null), []);

  const toggle = useCallback(() => {
    const val = !autoNextRef.current;
    try { localStorage.setItem(KEY, String(val)); } catch { /* localStorage unavailable */ }
    setAutoNextState(val);
    // If turning ON with a pending action, fire it immediately
    if (val && nextActionRef.current) {
      const action = nextActionRef.current;
      setNextAction(null);
      action();
    }
  }, []);

  return { autoNext, toggle, nextAction, schedule, reset };
}
