/**
 * Minimal module-level pub-sub store.
 * Replaces the duplicated cache + Set<listener> + notify pattern
 * used across use-settings, use-tasks, use-agent-identity.
 */
export interface Store<T> {
  get(): T | null;
  set(value: T): void;
  subscribe(fn: () => void): () => void;
  notify(): void;
}

export function createStore<T>(initial: T | null = null): Store<T> {
  let value: T | null = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (v: T) => { value = v; listeners.forEach(fn => fn()); },
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    notify: () => { listeners.forEach(fn => fn()); },
  };
}
