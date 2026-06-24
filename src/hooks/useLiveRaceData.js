import { useState, useEffect, useRef } from 'react';
import { OpenF1Service } from '../services/api';

const isRaceWeekend = () => {
  const day = new Date().getDay();
  // 0 is Sunday, 5 is Friday, 6 is Saturday
  return day === 5 || day === 6 || day === 0;
};

export function useLiveRaceData(session_key, pollingInterval = 5000) {
  const [liveData, setLiveData] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!session_key) return;

    const checkAndPoll = async () => {
      if (isRaceWeekend()) {
        setIsLive(true);
        try {
          // Fetch live position data for the current session
          const data = await OpenF1Service.getLivePosition(session_key);
          setLiveData(data);
          setError(null);
        } catch (err) {
          setError(err);
        }
      } else {
        setIsLive(false);
      }
    };

    // Initial check
    checkAndPoll();

    // Setup polling if it's race weekend
    if (isRaceWeekend()) {
      intervalRef.current = setInterval(checkAndPoll, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session_key, pollingInterval]);

  return { liveData, isLive, error };
}
