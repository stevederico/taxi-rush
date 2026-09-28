/**
 * Load the page-view tracker when the build was given one. Both values come
 * from the environment (VITE_ANALYTICS_SRC and VITE_ANALYTICS_ID), so a plain
 * build makes no network requests at all.
 */
export function loadAnalytics(): void {
  const src: unknown = import.meta.env.VITE_ANALYTICS_SRC;
  const id: unknown = import.meta.env.VITE_ANALYTICS_ID;
  if (typeof src !== 'string' || typeof id !== 'string' || !src || !id) return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = src;
  script.dataset.websiteId = id;
  document.head.append(script);
}
