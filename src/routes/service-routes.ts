import { ServicesController } from "@/controllers/services-controller";
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "@/middlewares/verifyUserAuthorization";
import { Router } from "express";

const servicesRoutes = Router();
const servicesController = new ServicesController();

servicesRoutes.use(ensureAuthenticated);

servicesRoutes.post("/", verifyUserAuthorization(["admin"]), (req, res, next) =>
  servicesController.create(req, res, next),
);

servicesRoutes.get(
  "/admin",
  verifyUserAuthorization(["admin"]),
  (req, res, next) => servicesController.indexAdmin(req, res, next),
);

servicesRoutes.get(
  "/customer",
  verifyUserAuthorization(["customer"]),
  (req, res, next) => servicesController.indexCustomer(req, res, next),
);

servicesRoutes.get(
  "/:id",
  verifyUserAuthorization(["admin"]),
  (req, res, next) => servicesController.show(req, res, next),
);

servicesRoutes.patch(
  "/update/:id",
  verifyUserAuthorization(["admin"]),
  (req, res, next) => servicesController.update(req, res, next),
);

servicesRoutes.patch(
  "/status/:id",
  verifyUserAuthorization(["admin"]),
  (req, res, next) => servicesController.status(req, res, next),
);

export { servicesRoutes };
