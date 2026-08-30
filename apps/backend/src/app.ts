import { Role } from "@atcon/database";
import { ApplicationController } from "./applications/application.controller.ts";
import { ApplicationRepository } from "./applications/application.repository.ts";
import { ApplicationService } from "./applications/application.service.ts";
import { AuthController } from "./auth/auth.controller.ts";
import { AuthService } from "./auth/auth.service.ts";
import { requireAuth, requireRole } from "./auth/middleware.ts";
import { UserRepository } from "./auth/user.repository.ts";
import { CandidateController } from "./candidates/candidate.controller.ts";
import { DashboardController } from "./dashboard/dashboard.controller.ts";
import { DashboardRepository } from "./dashboard/dashboard.repository.ts";
import { DashboardService } from "./dashboard/dashboard.service.ts";
import { CandidateRepository } from "./candidates/candidate.repository.ts";
import { CandidateService } from "./candidates/candidate.service.ts";
import { ResumeController } from "./candidates/resume.controller.ts";
import { ResumeRepository } from "./candidates/resume.repository.ts";
import { ResumeService } from "./candidates/resume.service.ts";
import { HealthController } from "./health/health.controller.ts";
import { HealthService } from "./health/health.service.ts";
import { InterviewController } from "./interviews/interview.controller.ts";
import { InterviewRepository } from "./interviews/interview.repository.ts";
import { InterviewService } from "./interviews/interview.service.ts";
import { JobController } from "./jobs/job.controller.ts";
import { JobRepository } from "./jobs/job.repository.ts";
import { JobService } from "./jobs/job.service.ts";
import { NotificationController } from "./notifications/notification.controller.ts";
import { NotificationRepository } from "./notifications/notification.repository.ts";
import { NotificationService } from "./notifications/notification.service.ts";
import { applicationRankQueue, notificationSendQueue, resumeParseQueue } from "./queue/queues.ts";
import { ResumeStorage } from "./shared/storage/resumeStorage.ts";
import { withErrorHandling } from "./shared/http/withErrorHandling.ts";

export function buildRoutes() {
  const healthController = new HealthController(new HealthService());

  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  const jobRepository = new JobRepository();
  const jobService = new JobService(jobRepository);
  const jobController = new JobController(jobService);

  const candidateRepository = new CandidateRepository();
  const candidateService = new CandidateService(candidateRepository);
  const candidateController = new CandidateController(candidateService);

  const resumeRepository = new ResumeRepository();
  const resumeStorage = new ResumeStorage();
  const resumeService = new ResumeService(resumeRepository, candidateRepository, resumeStorage, resumeParseQueue);
  const resumeController = new ResumeController(resumeService);

  const notificationRepository = new NotificationRepository();
  const notificationService = new NotificationService(notificationRepository, notificationSendQueue);
  const notificationController = new NotificationController(notificationService);

  const applicationRepository = new ApplicationRepository();
  const applicationService = new ApplicationService(
    applicationRepository,
    jobRepository,
    candidateRepository,
    resumeRepository,
    applicationRankQueue,
    notificationService,
  );
  const applicationController = new ApplicationController(applicationService);

  const interviewRepository = new InterviewRepository();
  const interviewService = new InterviewService(
    interviewRepository,
    applicationRepository,
    candidateRepository,
    userRepository,
    notificationService,
  );
  const interviewController = new InterviewController(interviewService);

  const dashboardRepository = new DashboardRepository();
  const dashboardService = new DashboardService(dashboardRepository, jobRepository);
  const dashboardController = new DashboardController(dashboardService);

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
    "/candidates/me": {
      GET: withErrorHandling(requireRole([Role.CANDIDATE], candidateController.getProfile)),
      PATCH: withErrorHandling(requireRole([Role.CANDIDATE], candidateController.updateProfile)),
    },
    "/candidates/me/resumes": {
      GET: withErrorHandling(requireRole([Role.CANDIDATE], resumeController.list)),
      POST: withErrorHandling(requireRole([Role.CANDIDATE], resumeController.upload)),
    },
    "/jobs/:jobId/applications": {
      POST: withErrorHandling(requireRole([Role.CANDIDATE], applicationController.apply)),
    },
    "/applications": {
      GET: withErrorHandling(requireAuth(applicationController.list)),
    },
    "/applications/:applicationId": {
      GET: withErrorHandling(requireAuth(applicationController.getById)),
    },
    "/applications/:applicationId/history": {
      GET: withErrorHandling(requireAuth(applicationController.getHistory)),
    },
    "/applications/:applicationId/stage": {
      PATCH: withErrorHandling(requireRole([Role.RECRUITER], applicationController.moveStage)),
    },
    "/applications/:applicationId/interviews": {
      GET: withErrorHandling(requireAuth(interviewController.listForApplication)),
      POST: withErrorHandling(requireRole([Role.RECRUITER], interviewController.schedule)),
    },
    "/interviews/:interviewId": {
      GET: withErrorHandling(requireAuth(interviewController.getById)),
      PATCH: withErrorHandling(requireRole([Role.RECRUITER], interviewController.update)),
    },
    "/interviews/:interviewId/reschedule": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], interviewController.reschedule)),
    },
    "/interviews/:interviewId/cancel": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], interviewController.cancel)),
    },
    "/interviews/:interviewId/complete": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], interviewController.complete)),
    },
    "/interviews/:interviewId/scorecard": {
      POST: withErrorHandling(requireRole([Role.RECRUITER], interviewController.submitScorecard)),
    },
    "/notifications": {
      GET: withErrorHandling(requireAuth(notificationController.list)),
    },
    "/notifications/:notificationId/read": {
      PATCH: withErrorHandling(requireAuth(notificationController.markAsRead)),
    },
    "/dashboard/overview": {
      GET: withErrorHandling(requireRole([Role.RECRUITER], dashboardController.overview)),
    },
    "/jobs/:jobId/pipeline": {
      GET: withErrorHandling(requireRole([Role.RECRUITER], dashboardController.jobPipeline)),
    },
  };
}
