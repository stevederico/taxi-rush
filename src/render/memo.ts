/**
 * Build a value once per key and hand back the same one after that. Used for
 * GPU resources, so things spawned all game long never allocate new ones.
 */
export function memo<K, V>(build: (key: K) => V): (key: K) => V {
  const cache = new Map<K, V>();
  return (key: K): V => {
    const found = cache.get(key);
    if (found !== undefined) return found;
    const made = build(key);
    cache.set(key, made);
    return made;
  };
}
