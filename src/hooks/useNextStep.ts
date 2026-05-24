import { useState, useRef } from 'react';

const KEY = 'meridian-auto-next';

export function useNextStep() {
  const [autoNext, setAutoNextState] = useState(() => {
    try { return localStorage.getItem(KEY) !== 'false'; }
    catch { return true; }
  });
  const [nextAction, setNextAction] = useState<(() => void) | null>(null);
  const autoNextRef = useRef(autoNext);
  const nextActionRef = useRef<(() => void) | null>(null);
  autoNextRef.current = autoNext;
  nextActionRef.current = nextAction;

  function schedule(delay: number, cb: () => void) {
    if (autoNextRef.current) setTimeout(cb, delay);
    else setNextAction(() => cb);
  }

  function reset() { setNextAction(null); }

  function toggle() {
    const val = !autoNext;
    try { localStorage.setItem(KEY, String(val)); } catch {}
    setAutoNextState(val);
    // If turning ON with a pending action, fire it immediately
    if (val && nextActionRef.current) {
      const action = nextActionRef.current;
      setNextAction(null);
      action();
    }
  }

  return { autoNext, toggle, nextAction, schedule, reset };
}
