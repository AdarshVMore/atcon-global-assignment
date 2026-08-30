import { describe, expect, test } from "bun:test";
import { HealthController } from "./health.controller.ts";
import type { HealthService } from "./health.service.ts";

interface HealthBody {
  status: string;
}

describe("HealthController", () => {
  test("returns ok when the database check succeeds", async () => {
    const service = { checkDatabaseConnection: async () => {} } as HealthService;
    const controller = new HealthController(service);

    const response = await controller.check();
    const body = (await response.json()) as HealthBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  test("returns 503 when the database check fails", async () => {
    const service = {
      checkDatabaseConnection: async () => {
        throw new Error("db down");
      },
    } as HealthService;
    const controller = new HealthController(service);

    const response = await controller.check();
    const body = (await response.json()) as HealthBody;

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });
});
