export const CACHE_TTL_SECONDS = 300;
export const CACHE_TTL_SINGLE = 120;
export const CACHE_CHECK_PERIOD = 60;

export const CacheKeys = {
  // Prefixes — used for bulk invalidation
  FUNDS_LIST_PREFIX: 'funds:list',
  INVESTORS_LIST_PREFIX: 'investors:list',
  INVESTMENTS_BY_FUND_PREFIX: 'investments:fund',

  // Full keys built from prefixes
  FUNDS_LIST: (page: number, limit: number) =>
    `${CacheKeys.FUNDS_LIST_PREFIX}:p${page}:l${limit}`,

  FUND_BY_ID: (id: string) => `funds:${id}`,

  INVESTORS_LIST: (page: number, limit: number) =>
    `${CacheKeys.INVESTORS_LIST_PREFIX}:p${page}:l${limit}`,

  INVESTOR_BY_ID: (id: string) => `investors:${id}`,

  INVESTMENTS_BY_FUND: (fundId: string, page: number, limit: number) =>
    `${CacheKeys.INVESTMENTS_BY_FUND_PREFIX}:${fundId}:p${page}:l${limit}`,
} as const;
