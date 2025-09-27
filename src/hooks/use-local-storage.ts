import { useCallback, useState } from "react";

interface StorageItem<T> {
  value: T;
  timestamp: number;
  ttl: number | null;
}

export const TTL = {
  FIVE_MINUTES: 5 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  NEVER: null,
} as const;

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  defaultTTL: number | null
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsedItem: StorageItem<T> = JSON.parse(item);

      if (
        parsedItem &&
        typeof parsedItem === "object" &&
        "timestamp" in parsedItem &&
        "value" in parsedItem &&
        "ttl" in parsedItem
      ) {

        if (
          parsedItem.ttl !== null &&
          Date.now() - parsedItem.timestamp > parsedItem.ttl
        ) {
          window.localStorage.removeItem(key);
          return initialValue;
        }
        return parsedItem.value;
      }

      window.localStorage.removeItem(key);
      return initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      window.localStorage.removeItem(key);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T), ttl: number | null = defaultTTL) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        const storageItem: StorageItem<T> = {
          value: valueToStore,
          timestamp: Date.now(),
          ttl,
        };
        window.localStorage.setItem(key, JSON.stringify(storageItem));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, defaultTTL]
  );

  const isValid = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return false;

      const parsedItem: StorageItem<T> = JSON.parse(item);
      if (
        parsedItem &&
        typeof parsedItem === "object" &&
        "timestamp" in parsedItem &&
        "ttl" in parsedItem
      ) {
        return (
          parsedItem.ttl === null ||
          Date.now() - parsedItem.timestamp <= parsedItem.ttl
        );
      }

      return false;
    } catch {
      return false;
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  const getTimeRemaining = useCallback(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return null;

      const parsedItem: StorageItem<T> = JSON.parse(item);
      if (
        parsedItem &&
        typeof parsedItem === "object" &&
        "timestamp" in parsedItem &&
        "ttl" in parsedItem
      ) {
        if (parsedItem.ttl === null) return Infinity;

        const remaining = parsedItem.ttl - (Date.now() - parsedItem.timestamp);
        return Math.max(0, remaining);
      }
      return null;
    } catch {
      return null;
    }
  }, [key]);

  return [
    storedValue,
    setValue,
    removeValue,
    isValid,
    getTimeRemaining,
  ] as const;
}
