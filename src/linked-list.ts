// src/linked-list.ts

import { inspect } from "node:util";

export type LinkedListNode<T> = {
  data: T;
  prev?: LinkedListNode<T>;
  next?: LinkedListNode<T>;
};

export class LinkedList<T> {
  first?: LinkedListNode<T> = undefined;
  last?: LinkedListNode<T> = undefined;
  size: number = 0;

  *[Symbol.iterator](): IterableIterator<T> {
    for (let node = this.first; node !== undefined; node = node.next) {
      yield node.data;
    }
  }

  *values(): IterableIterator<T> {
    for (let node = this.first; node !== undefined; node = node.next) {
      yield node.data;
    }
  }

  [inspect.custom](depth: number, options: Parameters<typeof inspect>[1]) {
    return {
      size: this.size,
      entries: [...this],
    };
  }

  toJSON(): T[] {
    const list = new Array(this.size);
    for (
      let node = this.first, i = 0;
      node !== undefined;
      node = node.next, i++
    ) {
      list[i] = node.data;
    }
    return list;
  }

  insertStart(data: T): LinkedListNode<T> {
    const newNode: LinkedListNode<T> = {
      data,
      prev: undefined,
      next: this.first,
    };
    if (this.first === undefined) {
      this.last = this.first = newNode;
    } else {
      this.first!.prev = newNode;
      this.first = newNode;
    }
    this.size++;
    return newNode;
  }

  insertEnd(data: T): LinkedListNode<T> {
    const newNode: LinkedListNode<T> = {
      data,
      prev: this.last,
      next: undefined,
    };
    if (this.first === undefined) {
      this.last = this.first = newNode;
    } else {
      this.last!.next = newNode;
      this.last = newNode;
    }
    this.size++;
    return newNode;
  }

  insertBefore(beforeNode: LinkedListNode<T>, data: T): LinkedListNode<T> {
    const { prev } = beforeNode;
    const newNode: LinkedListNode<T> = {
      data,
      prev,
      next: beforeNode,
    };
    if (prev !== undefined) {
      prev.next = newNode;
    }
    beforeNode.prev = newNode;
    if (this.first === beforeNode) {
      this.first = newNode;
    }
    this.size++;
    return newNode;
  }

  insertAfter(afterNode: LinkedListNode<T>, data: T): LinkedListNode<T> {
    const { next } = afterNode;
    const newNode: LinkedListNode<T> = {
      data,
      prev: afterNode,
      next,
    };
    if (next !== undefined) {
      next.prev = newNode;
    }
    afterNode.next = newNode;
    if (this.last === afterNode) {
      this.last = newNode;
    }
    this.size++;
    return newNode;
  }

  moveBefore(
    beforeNode: LinkedListNode<T>,
    node: LinkedListNode<T>,
  ): LinkedList<T> {
    if (node === beforeNode) {
      return this;
    }
    // splice node
    {
      const { prev, next } = node;
      if (prev !== undefined) {
        prev.next = next;
      }
      if (next !== undefined) {
        next.prev = prev;
      }
    }
    // insert node before
    const { prev } = beforeNode;
    if (prev !== undefined) {
      prev.next = node;
    }
    beforeNode.prev = node;
    node.prev = prev;
    node.next = beforeNode;
    if (this.first === beforeNode) {
      this.first = node;
    }
    return this;
  }

  moveAfter(
    afterNode: LinkedListNode<T>,
    node: LinkedListNode<T>,
  ): LinkedList<T> {
    if (node === afterNode) {
      return this;
    }
    // splice node
    {
      const { prev, next } = node;
      if (prev !== undefined) {
        prev.next = next;
      }
      if (next !== undefined) {
        next.prev = prev;
      }
    }
    // insert node after
    const { next } = afterNode;
    if (next !== undefined) {
      next.prev = node;
    }
    afterNode.next = node;
    node.next = next;
    node.prev = afterNode;
    if (this.last === afterNode) {
      this.last = node;
    }
    return this;
  }

  popStart(): T | undefined {
    if (this.first !== undefined) {
      const { data, next } = this.first;
      this.first = next;
      if (next !== undefined) {
        next.prev = undefined;
      }
      if (this.first === undefined) {
        this.last = undefined;
      }
      this.size--;
      return data;
    }
    return undefined;
  }

  popEnd(): T | undefined {
    if (this.last !== undefined) {
      const { data, prev } = this.last;
      this.last = prev;
      if (prev !== undefined) {
        prev.next = undefined;
      }
      if (this.last === undefined) {
        this.first = undefined;
      }
      this.size--;
      return data;
    }
    return undefined;
  }

  cutStart(
    node: LinkedListNode<T>,
    cutSize: number,
  ): LinkedListNode<T> | undefined {
    const { prev } = node;
    this.first = node;
    node.prev = undefined;
    if (prev !== undefined) {
      prev.next = undefined;
    }
    this.size -= cutSize;
    return prev;
  }

  cutEnd(
    node: LinkedListNode<T>,
    cutSize: number,
  ): LinkedListNode<T> | undefined {
    const { next } = node;
    this.last = node;
    node.next = undefined;
    if (next !== undefined) {
      next.prev = undefined;
    }
    this.size -= cutSize;
    return next;
  }

  cutLeft(
    node: LinkedListNode<T>,
    cutSize: number,
  ): LinkedListNode<T> | undefined {
    const { prev } = node;
    this.last = prev;
    if (prev === undefined) {
      this.first = undefined;
    } else {
      prev.next = undefined;
    }
    node.prev = undefined;
    this.size -= cutSize;
    return node;
  }

  cutRight(
    node: LinkedListNode<T>,
    cutSize: number,
  ): LinkedListNode<T> | undefined {
    const { next } = node;
    this.first = next;
    if (next === undefined) {
      this.last = undefined;
    } else {
      next.prev = undefined;
    }
    node.next = undefined;
    this.size -= cutSize;
    return node;
  }

  remove(node: LinkedListNode<T>): LinkedListNode<T> {
    const { prev, next } = node;
    if (prev !== undefined) {
      prev.next = next;
      node.prev = undefined;
    }
    if (next !== undefined) {
      next.prev = prev;
      node.next = undefined;
    }
    if (node === this.first) {
      this.first = next;
    }
    if (node === this.last) {
      this.last = prev;
    }
    this.size--;
    return node;
  }

  moveToStart(node: LinkedListNode<T>): LinkedListNode<T> {
    if (node === this.first) {
      return node;
    }
    const { prev, next } = node;
    // detach node
    if (prev !== undefined) {
      prev.next = next;
    }
    if (next !== undefined) {
      next.prev = prev;
    } else {
      this.last = prev;
    }
    // insert start
    node.next = this.first;
    node.prev = undefined;
    this.first!.prev = node;
    this.first = node;
    return node;
  }

  moveToEnd(node: LinkedListNode<T>): LinkedListNode<T> {
    if (node === this.last) {
      return node;
    }
    const { prev, next } = node;
    // detach node
    if (prev !== undefined) {
      prev.next = next;
    } else {
      this.first = next;
    }
    if (next !== undefined) {
      next.prev = prev;
    }
    // insert end
    node.prev = this.last;
    node.next = undefined;
    this.last!.next = node;
    this.last = node;
    return node;
  }

  clear() {
    this.first = this.last = undefined;
    this.size = 0;
  }
}
