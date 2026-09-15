/**
 * idb_cache.ts — High-Performance Native IndexedDB Storage Layer
 * The Win Concept Lottery Analytics Platform
 *
 * Provides asynchronous, non-blocking client-side persistence for full historical
 * draw databases, analytical frequencies, and mathematical models.
 * Completely bypasses localStorage 5MB size limits and prevents main-thread I/O blocking.
 */

const DB_NAME = "win_concept_db";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available in current environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

/**
 * Retrieves a cached item from IndexedDB by key.
 */
export async function getCacheItem<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined ? (request.result as T) : null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn(`[IDB Cache] Read error for key "${key}":`, err);
    return null;
  }
}

/**
 * Sets an item in IndexedDB with an optional timestamp.
 */
export async function setCacheItem<T = any>(key: string, value: T): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn(`[IDB Cache] Write error for key "${key}":`, err);
    return false;
  }
}

/**
 * Removes a specific cached item.
 */
export async function deleteCacheItem(key: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn(`[IDB Cache] Delete error for key "${key}":`, err);
    return false;
  }
}
