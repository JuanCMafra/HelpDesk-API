import { ServicesController } from "@/controllers/services-controller";
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "@/middlewares/verifyUserAuthorization";
import { Router } from "express";

const servicesRoutes = Router();
const servicesController = new ServicesController();

servicesRoutes.use(ensureAuthenticated, verifyUserAuthorization(["admin"]));

servicesRoutes.post("/", (req, res, next) =>
  servicesController.create(req, res, next),
);

servicesRoutes.get("/", (req, res, next) =>
  servicesController.show(req, res, next),
);

servicesRoutes.patch("/update/:id", (req, res, next) =>
  servicesController.update(req, res, next),
);

servicesRoutes.patch("/status/:id", (req, res, next) =>
  servicesController.status(req, res, next),
);

export { servicesRoutes };
