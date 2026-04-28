import { useState, useCallback, useEffect } from 'react';

/**
 * Generic async state hook. Handles loading, error, and data states.
 * Optional `immediate` flag triggers the fetch on mount.
 */
export function useAsync(asyncFn, immediate = false, deps = []) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null });

  const execute = useCallback(async (...args) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await asyncFn(...args);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState({ data: null, loading: false, error: err });
      throw err;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { ...state, execute };
}
