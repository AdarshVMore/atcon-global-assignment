import { verifyDatabaseConnection } from "../../infrastructure/database/client.ts";

export class HealthService {
  async checkDatabaseConnection(): Promise<void> {
    await verifyDatabaseConnection();
  }
}
