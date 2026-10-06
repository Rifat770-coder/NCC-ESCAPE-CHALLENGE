"use client";

// Only share overlapping GETs. Nothing survives completion, reload or logout;
// authoritative responses are never persisted or served from a local TTL cache.
const pendingReads = new Map<string, Promise<unknown>>();

export function fetchSharedJSON<T>(url: string): Promise<T> {
  const existing = pendingReads.get(url);
  if (existing) return existing as Promise<T>;

  const request = fetch(url, { cache: "no-store" }).then((response) => response.json() as Promise<T>);
  pendingReads.set(url, request);
  const clear = () => {
    if (pendingReads.get(url) === request) pendingReads.delete(url);
  };
  // Using both handlers avoids an unhandled rejected finally() promise.
  void request.then(clear, clear);
  return request;
}
