import { useState, useEffect } from 'react';

export function useOpenF1(fetchFunction, ...args) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Using stringified args to avoid complex expression in dependency array
  const argsString = JSON.stringify(args);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchFunction(...JSON.parse(argsString));
        if (isMounted) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();

    return () => {
      isMounted = false;
    };
  }, [fetchFunction, argsString]);

  return { data, loading, error };
}
