const BASE_URL = 'https://api.openf1.org/v1';

const activeRequests = {};

export const fetchWithRetry = async (url, retries = 4, delay = 800, useCache = true) => {
  const sessionStorageKey = `f1_cache_${url}`;
  
  if (useCache) {
    const cachedData = sessionStorage.getItem(sessionStorageKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch {
        sessionStorage.removeItem(sessionStorageKey);
      }
    }
    
    if (activeRequests[url]) {
      return activeRequests[url];
    }
  }

  const promise = (async () => {
    let lastStatus = 0;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        lastStatus = res.status;
        
        if (res.status === 404) {
          return null;
        }
        if (res.status === 429) {
          throw new Error('Rate limit');
        }
        if (res.status >= 500) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) {
          return null;
        }
        
        const data = await res.json();
        if (data && (data.status === 404 || data.error === 404)) {
          return null;
        }
        
        if (useCache) {
          sessionStorage.setItem(sessionStorageKey, JSON.stringify(data));
        }
        return data;
      } catch (err) {
        const isRetryable = lastStatus === 429 || lastStatus >= 500 || err.name === 'TypeError' || err.message === 'Failed to fetch' || err.message === 'Rate limit';
        if (!isRetryable || i === retries - 1) {
          if (!isRetryable) {
            return null;
          }
          throw err;
        }
        const waitTime = lastStatus === 429 ? 2000 * Math.pow(1.5, i) : delay * Math.pow(2, i);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  })();

  if (useCache) {
    activeRequests[url] = promise;
    promise.finally(() => {
      delete activeRequests[url];
    });
  }

  return promise;
};

export const fetchWithCache = async (url, cacheKey, ttlInMinutes = 60) => {
  const now = Date.now();
  const ttlMs = ttlInMinutes * 60 * 1000;
  
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (timestamp + ttlMs > now) {
        return data;
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  if (activeRequests[url]) {
    return activeRequests[url];
  }

  const promise = (async () => {
    let lastStatus = 0;
    const maxRetries = 3;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const res = await fetch(url);
        lastStatus = res.status;
        
        if (res.status === 404) {
          return null;
        }
        if (res.status === 429) {
          throw new Error('Rate limit');
        }
        if (res.status >= 500) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) {
          return null;
        }
        
        const data = await res.json();
        if (data && (data.status === 404 || data.error === 404)) {
          return null;
        }
        
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        return data;
      } catch (err) {
        const isRetryable = lastStatus === 429 || lastStatus >= 500 || err.name === 'TypeError' || err.message === 'Failed to fetch' || err.message === 'Rate limit';
        if (!isRetryable || i === maxRetries) {
          if (cached) {
            try {
              const { data } = JSON.parse(cached);
              return data;
            } catch { /* ignore */ }
          }
          if (!isRetryable) {
            return null;
          }
          throw err;
        }
        const waitTime = lastStatus === 429 ? 2000 * Math.pow(1.5, i) : 2000;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  })();

  activeRequests[url] = promise;
  promise.finally(() => {
    delete activeRequests[url];
  });
  return promise;
};

export const fetchRaceResults = async (year, round) => {
  const cacheKey = `f1_results_${year}_${round}`;
  const ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const now = Date.now();

  // Check localStorage first
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.timestamp === 'number' && parsed.data && (now < parsed.timestamp + ttlMs)) {
        return parsed.data;
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const url = `https://f1api.dev/api/${year}/${round}/race`;

  // Deduplicate active requests using activeRequests map
  if (activeRequests[url]) {
    return activeRequests[url];
  }

  const promise = (async () => {
    let lastStatus = 0;
    const maxRetries = 3;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const res = await fetch(url);
        lastStatus = res.status;

        if (res.status === 404) {
          return null;
        }
        if (res.status === 429) {
          throw new Error('Rate limit');
        }
        if (res.status >= 500) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) {
          return null;
        }

        const data = await res.json();
        if (data && (data.status === 404 || data.error === 404)) {
          return null;
        }

        // Verify array 'results' exists in the response structure
        let rawResults = null;
        if (data && data.races) {
          if (Array.isArray(data.races)) {
            rawResults = data.races[0]?.results;
          } else {
            rawResults = data.races.results;
          }
        } else if (data && data.race_results) {
          rawResults = data.race_results;
        }

        const resultsExist = Array.isArray(rawResults);

        // Store in localStorage if fetch succeeded (HTTP 200) and results array exists
        if (res.status === 200 && resultsExist) {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        }

        return data;
      } catch (err) {
        const isRetryable = lastStatus === 429 || lastStatus >= 500 || err.name === 'TypeError' || err.message === 'Failed to fetch' || err.message === 'Rate limit';
        if (!isRetryable || i === maxRetries) {
          if (!isRetryable) {
            return null;
          }
          throw err;
        }
        const waitTime = lastStatus === 429 ? 2000 * Math.pow(1.5, i) : 2000;
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
    return null;
  })();

  activeRequests[url] = promise;
  promise.finally(() => {
    delete activeRequests[url];
  });

  return promise;
};

export const fetchDriverPhotos = async () => {
  const cacheKey = 'openf1_drivers_photos';
  const ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const now = Date.now();

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.timestamp === 'number' && Array.isArray(parsed.data) && (now < parsed.timestamp + ttlMs)) {
        return parsed.data;
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const url = 'https://api.openf1.org/v1/drivers?session_key=latest';
  try {
    const res = await fetch(url);
    if (res.status === 200) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        return data;
      }
    }
  } catch (e) {
    console.error('Failed to fetch driver photos from OpenF1:', e);
  }

  // Fallback to expired cache if request fails
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return parsed.data;
    } catch { /* ignore */ }
  }

  return [];
};

export const fetchOpenF1 = async (endpoint, params = {}) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const OpenF1Service = {
  getCircuits: () => fetchOpenF1('/circuits'),
  getMeetings: (year = new Date().getFullYear()) => fetchOpenF1('/meetings', { year: Math.min(year, 2024) }),
  getSessions: (meeting_key) => fetchOpenF1('/sessions', { meeting_key }),
  getStandings: () => fetchOpenF1('/position'),
  getLivePosition: (session_key) => fetchOpenF1('/position', { session_key }),
  getCarData: (session_key) => fetchOpenF1('/car_data', { session_key }),
};
