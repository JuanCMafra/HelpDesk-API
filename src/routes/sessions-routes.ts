import { SessionsController } from "@/controllers/sessions-controller";
import { Router } from "express";

const sessionsRoutes = Router();
const sessionsController = new SessionsController();

sessionsRoutes.post("/", (req, res, next) => 
  sessionsController.create(req, res, next)
);

export { sessionsRoutes };
