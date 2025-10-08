import { useState, useEffect } from 'react';
import { fetchActiveAlertCount } from '../api/alerts';

interface UseAlertCountResult {
  count: number;
  loading: boolean;
}

const DEFAULT_POLL_INTERVAL = 600_000; // 10 minutes

export default function useAlertCount(
  pollInterval: number = DEFAULT_POLL_INTERVAL
): UseAlertCountResult {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const getAlertCount = async () => {
      setLoading(true);
      try {
        const response = await fetchActiveAlertCount();
        if (response && typeof response.count === 'number') {
          if (isMounted) setCount(response.count);
        } else if (isMounted) {
          setCount(0);
        }
      } catch (error) {
        console.error('Failed to fetch alert count:', error);
        if (isMounted) setCount(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void getAlertCount();
    intervalId = setInterval(() => void getAlertCount(), pollInterval);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollInterval]);

  return { count, loading };
}
