import { describe, expect, test } from "bun:test";
import type { Notification } from "@atcon/database";
import type IORedis from "ioredis";
import { NotificationStreamHub } from "../../src/modules/notifications/notificationStreamHub.ts";
import { NOTIFICATION_CHANNEL } from "../../src/modules/notifications/notificationPubSub.ts";

type MessageHandler = (channel: string, message: string) => void;

function fakeSubscriberConnection(): IORedis & { emit: MessageHandler } {
  let messageHandler: MessageHandler | undefined;
  const connection = {
    subscribe: async () => 1,
    on: (event: string, handler: MessageHandler) => {
      if (event === "message") messageHandler = handler;
      return connection;
    },
    emit: (channel: string, message: string) => messageHandler?.(channel, message),
  };
  return connection as unknown as IORedis & { emit: MessageHandler };
}

async function readOne(reader: { read(): Promise<{ value?: Uint8Array }> }): Promise<string> {
  const { value } = await reader.read();
  return new TextDecoder().decode(value);
}

describe("NotificationStreamHub", () => {
  test("delivers a published event to the matching user's open stream", async () => {
    const connection = fakeSubscriberConnection();
    const hub = new NotificationStreamHub(connection);
    const response = hub.createStreamResponse("user-1");
    const reader = response.body!.getReader();

    const notification = { id: "n1", title: "New application", message: "A candidate applied" } as Notification;
    connection.emit(NOTIFICATION_CHANNEL, JSON.stringify({ userId: "user-1", notification }));

    const chunk = await readOne(reader);
    expect(chunk).toContain("data: ");
    expect(chunk).toContain("New application");

    await reader.cancel();
  });

  test("does not deliver another user's event", async () => {
    const connection = fakeSubscriberConnection();
    const hub = new NotificationStreamHub(connection);
    const response = hub.createStreamResponse("user-1");
    const reader = response.body!.getReader();

    connection.emit(
      NOTIFICATION_CHANNEL,
      JSON.stringify({ userId: "user-2", notification: { id: "n2", title: "Not for you" } }),
    );

    const result = await Promise.race([
      reader.read().then(() => "delivered"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 100)),
    ]);
    expect(result).toBe("timeout");

    await reader.cancel();
  });

  test("ignores a malformed pub/sub message instead of crashing", async () => {
    const connection = fakeSubscriberConnection();
    const hub = new NotificationStreamHub(connection);
    const response = hub.createStreamResponse("user-1");
    const reader = response.body!.getReader();

    expect(() => connection.emit(NOTIFICATION_CHANNEL, "not json")).not.toThrow();

    await reader.cancel();
  });

  test("sets SSE response headers", () => {
    const hub = new NotificationStreamHub(fakeSubscriberConnection());
    const response = hub.createStreamResponse("user-1");

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
