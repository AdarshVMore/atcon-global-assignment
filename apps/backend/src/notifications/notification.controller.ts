import type { BunRequest } from "bun";
import type { AuthenticatedRequest } from "../auth/middleware.ts";
import type { NotificationService } from "./notification.service.ts";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  list = async (req: AuthenticatedRequest): Promise<Response> => {
    const notifications = await this.notificationService.listForUser(req.user.id);
    return Response.json({ notifications });
  };

  markAsRead = async (req: AuthenticatedRequest<BunRequest<"/notifications/:notificationId/read">>): Promise<Response> => {
    const notification = await this.notificationService.markAsRead(req.params.notificationId, req.user.id);
    return Response.json(notification);
  };
}
