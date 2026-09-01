import { describe, expect, test } from "bun:test";
import { signAccessToken } from "../../src/modules/auth/token.ts";
import { requireAuth, requireAuthFromQuery, requireRole } from "../../src/modules/auth/auth.middleware.ts";
import { withErrorHandling } from "../../src/middleware/error.middleware.ts";

function requestWithToken(token?: string): Request {
  const headers = new Headers();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request("http://localhost/protected", { headers });
}

function requestWithQueryToken(token?: string): Request {
  const url = token ? `http://localhost/protected?token=${encodeURIComponent(token)}` : "http://localhost/protected";
  return new Request(url);
}

describe("requireAuth", () => {
  test("rejects a request without a bearer token", async () => {
    const handler = withErrorHandling(requireAuth(async () => Response.json({ ok: true })));

    const response = await handler(requestWithToken());

    expect(response.status).toBe(401);
  });

  test("rejects a request with an invalid token", async () => {
    const handler = withErrorHandling(requireAuth(async () => Response.json({ ok: true })));

    const response = await handler(requestWithToken("not-a-real-token"));

    expect(response.status).toBe(401);
  });

  test("attaches the authenticated user for a valid token", async () => {
    const token = await signAccessToken({ id: "user-1", email: "candidate@atcon.dev", role: "CANDIDATE" });
    const handler = withErrorHandling(requireAuth(async (req) => Response.json({ userId: req.user.id })));

    const response = await handler(requestWithToken(token));
    const body = (await response.json()) as { userId: string };

    expect(response.status).toBe(200);
    expect(body.userId).toBe("user-1");
  });
});

describe("requireAuthFromQuery", () => {
  test("rejects a request without a token query param", async () => {
    const handler = withErrorHandling(requireAuthFromQuery(async () => Response.json({ ok: true })));

    const response = await handler(requestWithQueryToken());

    expect(response.status).toBe(401);
  });

  test("rejects an invalid token", async () => {
    const handler = withErrorHandling(requireAuthFromQuery(async () => Response.json({ ok: true })));

    const response = await handler(requestWithQueryToken("not-a-real-token"));

    expect(response.status).toBe(401);
  });

  test("attaches the authenticated user for a valid token", async () => {
    const token = await signAccessToken({ id: "user-1", email: "candidate@atcon.dev", role: "CANDIDATE" });
    const handler = withErrorHandling(requireAuthFromQuery(async (req) => Response.json({ userId: req.user.id })));

    const response = await handler(requestWithQueryToken(token));
    const body = (await response.json()) as { userId: string };

    expect(response.status).toBe(200);
    expect(body.userId).toBe("user-1");
  });
});

describe("requireRole", () => {
  test("rejects a role that isn't allowed", async () => {
    const token = await signAccessToken({ id: "user-1", email: "candidate@atcon.dev", role: "CANDIDATE" });
    const handler = withErrorHandling(requireRole(["RECRUITER"], async () => Response.json({ ok: true })));

    const response = await handler(requestWithToken(token));

    expect(response.status).toBe(403);
  });

  test("allows a role that is permitted", async () => {
    const token = await signAccessToken({ id: "user-2", email: "recruiter@atcon.dev", role: "RECRUITER" });
    const handler = withErrorHandling(requireRole(["RECRUITER"], async () => Response.json({ ok: true })));

    const response = await handler(requestWithToken(token));

    expect(response.status).toBe(200);
  });
});
