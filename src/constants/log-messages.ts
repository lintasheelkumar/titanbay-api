export const LOG_MESSAGES = {
  // Server
  SERVER_STARTED: 'Server started',
  DB_CONNECTED: 'Database connected',

  // Fund
  FUND_LIST_FETCHED: 'Fund list fetched',
  FUND_LIST_FAILED: 'Fund list fetch failed',
  FUND_FETCHED: 'Fund fetched',
  FUND_NOT_FOUND: 'Fund not found',
  FUND_CREATED: 'Fund created',
  FUND_CREATE_FAILED: 'Fund creation failed',
  FUND_UPDATED: 'Fund updated',
  FUND_UPDATE_FAILED: 'Fund update failed',

  // Investor
  INVESTOR_LIST_FETCHED: 'Investor list fetched',
  INVESTOR_LIST_FAILED: 'Investor list fetch failed',
  INVESTOR_CREATED: 'Investor created',
  INVESTOR_CREATE_FAILED: 'Investor creation failed',
  INVESTOR_NOT_FOUND: 'Investor not found',

  // Investment
  INVESTMENT_LIST_FETCHED: 'Investment list fetched',
  INVESTMENT_LIST_FAILED: 'Investment list fetch failed',
  INVESTMENT_CREATED: 'Investment created',
  INVESTMENT_CREATE_FAILED: 'Investment creation failed',

  // Cache
  CACHE_HIT: 'Cache hit',
  CACHE_MISS: 'Cache miss',
  CACHE_READ_ERROR: 'Cache read failed — falling through to DB',
  CACHE_WRITE_ERROR: 'Cache write failed — continuing without cache',
  CACHE_INVALIDATED: 'Cache invalidated',

  // Performance
  SLOW_QUERY_DETECTED: 'Slow query detected',
} as const;
