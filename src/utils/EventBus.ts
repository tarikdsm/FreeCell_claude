/**
 * Type-safe pub/sub event bus for decoupled communication.
 */
export type EventHandler<T> = (data: T) => void;

export class EventBus<EventMap extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof EventMap, Set<EventHandler<any>>>();

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified.
   */
  off<K extends keyof EventMap>(event?: K): void {
    if (event !== undefined) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
