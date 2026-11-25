// Clock injection makes inactivity/privacy boundaries testable without waiting on background-tab timers.
export function createIdleSession(onExpire: () => void, now: () => number = Date.now, timeoutSeconds = 60) {
  let deadline = now() + timeoutSeconds * 1000;
  let expired = false;
  const touch = () => { deadline = now() + timeoutSeconds * 1000; expired = false; return timeoutSeconds; };
  return {
    touch,
    tick(hasSession: boolean, processing: boolean) {
      if (processing || !hasSession) return touch();
      const remaining = Math.min(timeoutSeconds, Math.max(0, Math.ceil((deadline - now()) / 1000)));
      if (remaining === 0 && !expired) { expired = true; onExpire(); }
      return remaining;
    }
  };
}
