import type IORedis from "ioredis";
import { createRedisConnection } from "../../infrastructure/redis/redisConnection.ts";
import { logger } from "../../shared/utils/logger.ts";
import { NOTIFICATION_CHANNEL, type NotificationEvent } from "./notificationPubSub.ts";

const HEARTBEAT_INTERVAL_MS = 20_000;

type Listener = (event: NotificationEvent) => void;

/**
 * Bridges the notification.created Redis pub/sub channel — published by the
 * notification worker, a separate process — to SSE connections held open by
 * this API process. One shared subscriber connection fanned out to
 * per-user listeners, rather than one Redis subscription per connection.
 */
export class NotificationStreamHub {
  private readonly listenersByUserId = new Map<string, Set<Listener>>();

  constructor(private readonly subscriberConnection: IORedis = createRedisConnection()) {
    this.subscriberConnection.subscribe(NOTIFICATION_CHANNEL).catch((error) => {
      logger.error("Failed to subscribe to the notification stream channel", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
    this.subscriberConnection.on("message", (_channel, message) => this.dispatch(message));
  }

  private dispatch(message: string): void {
    let event: NotificationEvent;
    try {
      event = JSON.parse(message) as NotificationEvent;
    } catch {
      return;
    }

    for (const listener of this.listenersByUserId.get(event.userId) ?? []) {
      listener(event);
    }
  }

  createStreamResponse(userId: string): Response {
    const listenersByUserId = this.listenersByUserId;
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let listener: Listener | undefined;

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        listener = (event) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.notification)}\n\n`));
        };

        let listeners = listenersByUserId.get(userId);
        if (!listeners) {
          listeners = new Set();
          listenersByUserId.set(userId, listeners);
        }
        listeners.add(listener);

        // Keeps intermediary proxies (the Next.js rewrite included) from
        // treating an idle connection as dead. A `:`-prefixed line is an
        // SSE comment — EventSource never fires `onmessage` for it.
        heartbeat = setInterval(() => controller.enqueue(encoder.encode(": heartbeat\n\n")), HEARTBEAT_INTERVAL_MS);
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat);
        if (!listener) return;
        const listeners = listenersByUserId.get(userId);
        listeners?.delete(listener);
        if (listeners && listeners.size === 0) {
          listenersByUserId.delete(userId);
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}
