import NodeCache from "node-cache";

const CACHE_TTL_SECONDS = 300; // 5 minutes
const CHECK_PERIOD_SECONDS = 60;

// Singleton cache — 5-minute TTL, check expired keys every 60s
const cache = new NodeCache({
  stdTTL: CACHE_TTL_SECONDS,
  checkperiod: CHECK_PERIOD_SECONDS,
  useClones: true, // return copies so callers can't mutate cached data
  deleteOnExpire: true,
});

cache.on("expired", (key: string) => {
  console.log(`[cache] Key expired: ${key}`);
});

export default cache;
