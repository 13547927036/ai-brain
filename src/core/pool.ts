/**
 * 稠密对象池：活跃对象始终占据 [0, length)。
 * 回收用「末尾填补」，O(1) 且不产生空洞 —— 遍历时不会碰到死对象。
 * 这是 spec 4.6 性能预算（敌人 120 / 子弹 200 / 掉落 80 / 飘字 24 / 粒子 200）的落地方式。
 */
export class Pool<T> {
  readonly items: T[];
  private count = 0;

  constructor(size: number, factory: () => T) {
    this.items = new Array<T>(size);
    for (let i = 0; i < size; i++) this.items[i] = factory();
  }

  get length(): number {
    return this.count;
  }

  get capacity(): number {
    return this.items.length;
  }

  get full(): boolean {
    return this.count >= this.items.length;
  }

  /** 取一个对象；池满返回 null（不扩容，保证帧时间可预测） */
  spawn(): T | null {
    if (this.count >= this.items.length) return null;
    const item = this.items[this.count];
    this.count++;
    return item ?? null;
  }

  /** 回收下标 i（末尾对象填补空位） */
  remove(i: number): void {
    if (i < 0 || i >= this.count) return;
    const last = this.count - 1;
    if (i !== last) {
      const tmp = this.items[i] as T;
      this.items[i] = this.items[last] as T;
      this.items[last] = tmp;
    }
    this.count = last;
  }

  /** 反向遍历中安全回收：调用方传当前下标即可 */
  clear(): void {
    this.count = 0;
  }
}
