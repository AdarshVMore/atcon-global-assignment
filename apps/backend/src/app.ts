import { AuthController } from "./auth/auth.controller.ts";
import { AuthService } from "./auth/auth.service.ts";
import { requireAuth } from "./auth/middleware.ts";
import { UserRepository } from "./auth/user.repository.ts";
import { HealthController } from "./health/health.controller.ts";
import { HealthService } from "./health/health.service.ts";
import { withErrorHandling } from "./shared/http/withErrorHandling.ts";

export function buildRoutes() {
  const healthController = new HealthController(new HealthService());

  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  return {
    "/health": {
      GET: withErrorHandling(healthController.check),
    },
    "/auth/register": {
      POST: withErrorHandling(authController.register),
    },
    "/auth/login": {
      POST: withErrorHandling(authController.login),
    },
    "/me": {
      GET: withErrorHandling(requireAuth(authController.me)),
    },
  };
}
