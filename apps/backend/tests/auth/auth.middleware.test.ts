import { describe, expect, test } from "bun:test";
import { signAccessToken } from "../../src/modules/auth/token.ts";
import { requireAuth, requireRole } from "../../src/modules/auth/auth.middleware.ts";
import { withErrorHandling } from "../../src/middleware/error.middleware.ts";

function requestWithToken(token?: string): Request {
  const headers = new Headers();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request("http://localhost/protected", { headers });
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
