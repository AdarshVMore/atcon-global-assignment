import { verifyDatabaseConnection } from "../database/client.ts";

export class HealthService {
  async checkDatabaseConnection(): Promise<void> {
    await verifyDatabaseConnection();
  }
}
