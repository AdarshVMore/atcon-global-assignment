import { describe, expect, test } from "bun:test";
import { NotFoundError } from "../../src/shared/errors/HttpError.ts";
import type { ApiErrorBody } from "../../src/shared/types/types.ts";
import { withErrorHandling } from "../../src/middleware/error.middleware.ts";

describe("withErrorHandling", () => {
  test("passes through a successful response", async () => {
    const handler = withErrorHandling(async () => Response.json({ ok: true }));

    const response = await handler(new Request("http://localhost/test"));

    expect(response.status).toBe(200);
  });

  test("maps a thrown HttpError to its status code", async () => {
    const handler = withErrorHandling(async () => {
      throw new NotFoundError("missing");
    });

    const response = await handler(new Request("http://localhost/test"));
    const body = (await response.json()) as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("missing");
  });

  test("maps an unexpected error to a 500 without leaking its message", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("boom");
    });

    const response = await handler(new Request("http://localhost/test"));
    const body = (await response.json()) as ApiErrorBody;

    expect(response.status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
  });
});
