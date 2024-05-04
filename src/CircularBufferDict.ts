export class CircularBufferDict<TKey, TValue> {
  private buffers: Map<TKey, CircularBuffer<TValue>>;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffers = new Map<TKey, CircularBuffer<TValue>>();
  }

  push(key: TKey, item: TValue): void {
    let buffer = this.buffers.get(key);
    if (!buffer) {
      buffer = new CircularBuffer<TValue>(this.capacity);
      this.buffers.set(key, buffer);
    }
    buffer.push(item);
  }

  get(key: TKey): CircularBuffer<TValue> | undefined {
    return this.buffers.get(key);
  }

  toArray(key: TKey): TValue[] | undefined {
    const buffer = this.buffers.get(key);
    return buffer ? buffer.toArray() : undefined;
  }
}

class CircularBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private length = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.length < this.capacity) {
      this.length++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result = [];
    for (let i = 0; i < this.length; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return result;
  }
}
