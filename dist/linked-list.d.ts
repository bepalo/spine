import { inspect } from "node:util";
export type LinkedListNode<T> = {
    data: T;
    prev?: LinkedListNode<T>;
    next?: LinkedListNode<T>;
};
export declare class LinkedList<T> {
    first?: LinkedListNode<T>;
    last?: LinkedListNode<T>;
    size: number;
    [Symbol.iterator](): IterableIterator<T>;
    values(): IterableIterator<T>;
    [inspect.custom](depth: number, options: Parameters<typeof inspect>[1]): {
        size: number;
        entries: T[];
    };
    toJSON(): T[];
    insertStart(data: T): LinkedListNode<T>;
    insertEnd(data: T): LinkedListNode<T>;
    insertBefore(beforeNode: LinkedListNode<T>, data: T): LinkedListNode<T>;
    insertAfter(afterNode: LinkedListNode<T>, data: T): LinkedListNode<T>;
    moveBefore(beforeNode: LinkedListNode<T>, node: LinkedListNode<T>): LinkedList<T>;
    moveAfter(afterNode: LinkedListNode<T>, node: LinkedListNode<T>): LinkedList<T>;
    popStart(): T | undefined;
    popEnd(): T | undefined;
    cutStart(node: LinkedListNode<T>, cutSize: number): LinkedListNode<T> | undefined;
    cutEnd(node: LinkedListNode<T>, cutSize: number): LinkedListNode<T> | undefined;
    cutLeft(node: LinkedListNode<T>, cutSize: number): LinkedListNode<T> | undefined;
    cutRight(node: LinkedListNode<T>, cutSize: number): LinkedListNode<T> | undefined;
    remove(node: LinkedListNode<T>): LinkedListNode<T>;
    moveToStart(node: LinkedListNode<T>): LinkedListNode<T>;
    moveToEnd(node: LinkedListNode<T>): LinkedListNode<T>;
    clear(): void;
}
//# sourceMappingURL=linked-list.d.ts.map