/**
 * Halchal (হালচাল) - Redis & Upstash Client Wrapper
 * Supports Upstash REST API and In-Memory fallback for tests and offline operation.
 */

import { Redis } from '@upstash/redis';

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<string | boolean | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
}

export class UpstashRedisWrapper implements IRedisClient {
  private client: Redis;

  constructor(url?: string, token?: string) {
    const restUrl = url || Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
    const restToken = token || Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';

    this.client = new Redis({
      url: restUrl,
      token: restToken,
    });
  }

  async get(key: string): Promise<string | null> {
    const res = await this.client.get<string>(key);
    return res !== null && res !== undefined ? String(res) : null;
  }

  async set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<string | boolean | null> {
    const setOptions: Record<string, unknown> = {};
    if (opts?.ex) setOptions.ex = opts.ex;
    if (opts?.nx) setOptions.nx = opts.nx;

    const res = await this.client.set(key, value, setOptions as Parameters<Redis['set']>[2]);
    return res;
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return await this.client.sadd(key, members[0], ...members.slice(1));
  }

  async smembers(key: string): Promise<string[]> {
    const res = await this.client.smembers(key);
    return Array.isArray(res) ? res.map(String) : [];
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (members.length === 0) return 0;
    return await this.client.srem(key, members[0], ...members.slice(1));
  }
}

export class InMemoryRedisClient implements IRedisClient {
  private storage = new Map<string, { value: string; expiresAt?: number }>();
  private sets = new Map<string, { set: Set<string>; expiresAt?: number }>();

  private cleanKey(key: string): boolean {
    const item = this.storage.get(key);
    if (!item) return false;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.storage.delete(key);
      return false;
    }
    return true;
  }

  private cleanSet(key: string): boolean {
    const item = this.sets.get(key);
    if (!item) return false;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.sets.delete(key);
      return false;
    }
    return true;
  }

  async get(key: string): Promise<string | null> {
    if (!this.cleanKey(key)) return null;
    return this.storage.get(key)!.value;
  }

  async set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<string | boolean | null> {
    const exists = this.cleanKey(key);
    if (opts?.nx && exists) {
      return null;
    }

    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.storage.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.storage.delete(key)) count++;
      if (this.sets.delete(key)) count++;
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get(key)) || '0';
    const num = parseInt(current, 10) + 1;
    const existing = this.storage.get(key);
    this.storage.set(key, {
      value: String(num),
      expiresAt: existing?.expiresAt,
    });
    return num;
  }

  async expire(key: string, seconds: number): Promise<number> {
    let touched = 0;
    const item = this.storage.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      touched = 1;
    }
    const setItem = this.sets.get(key);
    if (setItem) {
      setItem.expiresAt = Date.now() + seconds * 1000;
      touched = 1;
    }
    return touched;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    this.cleanSet(key);
    let item = this.sets.get(key);
    if (!item) {
      item = { set: new Set<string>() };
      this.sets.set(key, item);
    }
    let added = 0;
    for (const member of members) {
      if (!item.set.has(member)) {
        item.set.add(member);
        added++;
      }
    }
    return added;
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.cleanSet(key)) return [];
    const item = this.sets.get(key);
    return item ? Array.from(item.set) : [];
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.cleanSet(key)) return 0;
    const item = this.sets.get(key);
    if (!item) return 0;
    let removed = 0;
    for (const member of members) {
      if (item.set.delete(member)) {
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this.storage.clear();
    this.sets.clear();
  }
}

let globalRedis: IRedisClient | null = null;

export function getRedisClient(custom?: IRedisClient): IRedisClient {
  if (custom) return custom;
  if (!globalRedis) {
    const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    if (url && token) {
      globalRedis = new UpstashRedisWrapper(url, token);
    } else {
      globalRedis = new InMemoryRedisClient();
    }
  }
  return globalRedis;
}

export function setGlobalRedisClient(client: IRedisClient | null): void {
  globalRedis = client;
}
