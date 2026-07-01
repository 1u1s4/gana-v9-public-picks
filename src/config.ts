const DEFAULT_API_BASE_URL = '/gana-api';
const DEFAULT_FEED_PATH = '/public-picks/feed';
const DEFAULT_POLL_MS = 45_000;

export type PublicFeedConfig = {
  apiBaseUrl: string;
  feedPath: string;
  pollMs: number;
};

export const publicFeedConfig: PublicFeedConfig = {
  apiBaseUrl:
    import.meta.env.VITE_PUBLIC_PICKS_API_BASE_URL?.trim() ||
    import.meta.env.VITE_GANA_API_BASE?.trim() ||
    DEFAULT_API_BASE_URL,
  feedPath: import.meta.env.VITE_PUBLIC_PICKS_FEED_PATH?.trim() || DEFAULT_FEED_PATH,
  pollMs: normalizePollMs(import.meta.env.VITE_PUBLIC_PICKS_POLL_MS ?? import.meta.env.VITE_GANA_API_POLL_MS),
};

export function getPublicFeedUrl(config = publicFeedConfig): string | null {
  if (!config.apiBaseUrl) return null;

  const feedPath = config.feedPath.startsWith('/') ? config.feedPath.slice(1) : config.feedPath;
  if (config.apiBaseUrl.startsWith('/')) {
    return `${config.apiBaseUrl.replace(/\/$/, '')}/${feedPath}`;
  }

  const baseUrl = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl : `${config.apiBaseUrl}/`;
  return new URL(feedPath, baseUrl).toString();
}

function normalizePollMs(value?: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 15_000) return DEFAULT_POLL_MS;
  return parsed;
}
