import type { HistoryItem } from '../types';

interface Node<K, V> {
  key: K;
  value: V;
  prev: Node<K, V> | null;
  next: Node<K, V> | null;
}


export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly map: Map<K, Node<K, V>> = new Map();
  private readonly head: Node<K, V> = { key: null as unknown as K, value: null as unknown as V, prev: null, next: null };
  private readonly tail: Node<K, V> = { key: null as unknown as K, value: null as unknown as V, prev: null, next: null };

  constructor(capacity: number) {
    this.capacity = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToFront(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }
    const node: Node<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addAfterHead(node);
    if (this.map.size > this.capacity) {
      this.evict();
    }
  }

  toArray(): V[] {
    const out: V[] = [];
    let cur = this.head.next;
    while (cur !== this.tail) {
      out.push(cur!.value);
      cur = cur!.next;
    }
    return out;
  }

  get size(): number {
    return this.map.size;
  }

  private addAfterHead(node: Node<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private unlink(node: Node<K, V>): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private moveToFront(node: Node<K, V>): void {
    this.unlink(node);
    this.addAfterHead(node);
  }

  private evict(): void {
    const lru = this.tail.prev!;
    if (lru === this.head) return;
    this.unlink(lru);
    this.map.delete(lru.key);
  }
}

// ── persistence helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'property-analyzer-history';
export const HISTORY_CAPACITY = 25;

export function loadHistoryCache(): LRUCache<string, HistoryItem> {
  const cache = new LRUCache<string, HistoryItem>(HISTORY_CAPACITY);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cache;
    const items: HistoryItem[] = JSON.parse(raw);
    for (let i = items.length - 1; i >= 0; i--) {
      cache.put(items[i].address.displayName, items[i]);
    }
  } catch {
    // corrupt storage — start fresh
  }
  return cache;
}

export function saveHistoryCache(cache: LRUCache<string, HistoryItem>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache.toArray()));
  } catch {
    // storage full or unavailable
  }
}
