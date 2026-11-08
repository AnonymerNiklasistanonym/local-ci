import { useEffect, useState } from 'react';
import { humanTime } from '../../utils/human.js';

interface ElapsedTimeProps {
  /**
   * The time when the time measurement started
   * (Date.now())
   */
  startTimeMs: number;
}

export const ElapsedTime = ({ startTimeMs }: ElapsedTimeProps) => {
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);

  useEffect(() => {
    // Initial elapsed time
    setElapsedTimeMs(performance.now() - startTimeMs);
    // Fast updates for the first second (every 50ms)
    let timer = setInterval(() => {
      setElapsedTimeMs(performance.now() - startTimeMs);
    }, 50);
    // After that switch to slower updates (every 1s)
    const slowTimer = setTimeout(() => {
      clearInterval(timer);
      timer = setInterval(() => {
        setElapsedTimeMs(performance.now() - startTimeMs);
      }, 1000);
      // More than one second so the timer is guaranteed to be 1s and not e.g. 989ms
    }, 1100);

    // Clean up on unmount
    return () => {
      clearInterval(timer);
      clearTimeout(slowTimer);
    };
  }, [startTimeMs]);

  return humanTime(elapsedTimeMs);
};
