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

    const res = await this.client.set(key, value, setOptions as Parameters<typeof this.client.set>[2]);
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
}

export class InMemoryRedisClient implements IRedisClient {
  private storage = new Map<string, { value: string; expiresAt?: number }>();

  private cleanKey(key: string): boolean {
    const item = this.storage.get(key);
    if (!item) return false;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.storage.delete(key);
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
    const item = this.storage.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  clear(): void {
    this.storage.clear();
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
