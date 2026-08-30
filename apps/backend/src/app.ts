import { Role } from "@atcon/database";
import { AuthController } from "./auth/auth.controller.ts";
import { AuthService } from "./auth/auth.service.ts";
import { requireAuth, requireRole } from "./auth/middleware.ts";
import { UserRepository } from "./auth/user.repository.ts";
import { HealthController } from "./health/health.controller.ts";
import { HealthService } from "./health/health.service.ts";
import { JobController } from "./jobs/job.controller.ts";
import { JobRepository } from "./jobs/job.repository.ts";
import { JobService } from "./jobs/job.service.ts";
import { withErrorHandling } from "./shared/http/withErrorHandling.ts";

export function buildRoutes() {
  const healthController = new HealthController(new HealthService());

  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  const jobRepository = new JobRepository();
  const jobService = new JobService(jobRepository);
  const jobController = new JobController(jobService);

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
    "/jobs": {
      GET: withErrorHandling(requireAuth(jobController.list)),
      POST: withErrorHandling(requireRole([Role.RECRUITER], jobController.create)),
    },
    "/jobs/:jobId": {
      GET: withErrorHandling(requireAuth(jobController.getById)),
      PATCH: withErrorHandling(requireRole([Role.RECRUITER], jobController.update)),
    },
    "/jobs/:jobId/publish": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], jobController.publish)),
    },
    "/jobs/:jobId/close": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], jobController.close)),
    },
    "/jobs/:jobId/stages": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], jobController.addStage)),
    },
    "/jobs/:jobId/stages/:stageId": {
      PATCH: withErrorHandling(requireRole([Role.RECRUITER], jobController.updateStage)),
    },
  };
}
