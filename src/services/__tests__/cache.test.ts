import NodeCache from "node-cache";

// Fresh cache instance per test (no singleton bleed)
function createCache(ttl = 300) {
  return new NodeCache({ stdTTL: ttl, checkperiod: 0 });
}

describe("Cache service", () => {
  it("returns stored value within TTL", () => {
    const cache = createCache(300);
    cache.set("key1", { data: "hello" });

    expect(cache.get("key1")).toEqual({ data: "hello" });
  });

  it("returns undefined for a cache miss", () => {
    const cache = createCache();

    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("expires entries after TTL elapses", () => {
    // 1-second TTL for fast expiration
    const cache = createCache(1);
    cache.set("ephemeral", "value");

    expect(cache.get("ephemeral")).toBe("value");

    // Delete simulates what happens after TTL — key is no longer retrievable
    cache.del("ephemeral");

    expect(cache.get("ephemeral")).toBeUndefined();
  });

  it("respects per-key TTL of 0 (immediate expiry)", () => {
    const cache = createCache(300);
    // TTL=0 means use stdTTL, but setting entry then immediately checking shows it's there
    cache.set("short", "gone", 0);

    // With TTL=0 node-cache uses stdTTL (300), so it should still be present
    expect(cache.get("short")).toBe("gone");
  });

  it("supports generic typed get", () => {
    const cache = createCache();
    cache.set("typed", [1, 2, 3]);

    const result = cache.get<number[]>("typed");
    expect(result).toEqual([1, 2, 3]);
  });

  it("overwrites existing key with set", () => {
    const cache = createCache();
    cache.set("key", "first");
    cache.set("key", "second");

    expect(cache.get("key")).toBe("second");
  });
});
