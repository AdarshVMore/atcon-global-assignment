import { Role } from "@atcon/database";
import { ApplicationController } from "./modules/applications/application.controller.ts";
import { ApplicationRepository } from "./modules/applications/application.repository.ts";
import { ApplicationService } from "./modules/applications/application.service.ts";
import { AuthController } from "./modules/auth/auth.controller.ts";
import { AuthService } from "./modules/auth/auth.service.ts";
import { requireAuth, requireAuthFromQuery, requireRole } from "./modules/auth/auth.middleware.ts";
import { UserRepository } from "./modules/auth/auth.repository.ts";
import { CandidateController } from "./modules/candidates/candidate.controller.ts";
import { DashboardController } from "./modules/dashboard/dashboard.controller.ts";
import { DashboardRepository } from "./modules/dashboard/dashboard.repository.ts";
import { DashboardService } from "./modules/dashboard/dashboard.service.ts";
import { CandidateRepository } from "./modules/candidates/candidate.repository.ts";
import { CandidateService } from "./modules/candidates/candidate.service.ts";
import { ResumeController } from "./modules/resumes/resume.controller.ts";
import { ResumeRepository } from "./modules/resumes/resume.repository.ts";
import { ResumeService } from "./modules/resumes/resume.service.ts";
import { HealthController } from "./modules/health/health.controller.ts";
import { HealthService } from "./modules/health/health.service.ts";
import { InterviewController } from "./modules/interviews/interview.controller.ts";
import { InterviewRepository } from "./modules/interviews/interview.repository.ts";
import { InterviewService } from "./modules/interviews/interview.service.ts";
import { JobController } from "./modules/jobs/job.controller.ts";
import { JobRepository } from "./modules/jobs/job.repository.ts";
import { JobService } from "./modules/jobs/job.service.ts";
import { NotificationController } from "./modules/notifications/notification.controller.ts";
import { NotificationRepository } from "./modules/notifications/notification.repository.ts";
import { NotificationService } from "./modules/notifications/notification.service.ts";
import { NotificationStreamHub } from "./modules/notifications/notificationStreamHub.ts";
import { applicationRankQueue } from "./queues/ranking.queue.ts";
import { notificationSendQueue } from "./queues/notification.queue.ts";
import { resumeParseQueue } from "./queues/resume.queue.ts";
import { ResumeStorage } from "./infrastructure/storage/resumeStorage.ts";
import { withErrorHandling } from "./middleware/error.middleware.ts";

export function buildRoutes() {
  const healthController = new HealthController(new HealthService());

  const userRepository = new UserRepository();
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  const jobRepository = new JobRepository();
  const jobService = new JobService(jobRepository);
  const jobController = new JobController(jobService);

  const candidateRepository = new CandidateRepository();
  const resumeRepository = new ResumeRepository();
  const applicationRepository = new ApplicationRepository();

  const candidateService = new CandidateService(candidateRepository, applicationRepository, resumeRepository);
  const candidateController = new CandidateController(candidateService);

  const resumeStorage = new ResumeStorage();
  const resumeService = new ResumeService(
    resumeRepository,
    candidateRepository,
    resumeStorage,
    resumeParseQueue,
    applicationRepository,
  );
  const resumeController = new ResumeController(resumeService);

  const notificationRepository = new NotificationRepository();
  const notificationService = new NotificationService(notificationRepository, notificationSendQueue);
  const notificationStreamHub = new NotificationStreamHub();
  const notificationController = new NotificationController(notificationService, notificationStreamHub);

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
    "/applications/:applicationId/candidate": {
      GET: withErrorHandling(requireRole([Role.RECRUITER], candidateController.getForApplication)),
    },
    "/applications/:applicationId/candidate/resumes/:resumeId": {
      GET: withErrorHandling(requireRole([Role.RECRUITER], resumeController.getFileForRecruiter)),
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
    "/notifications/stream": {
      GET: withErrorHandling(requireAuthFromQuery(notificationController.stream)),
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
