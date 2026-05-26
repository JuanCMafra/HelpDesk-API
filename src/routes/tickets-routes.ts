import { TicketsController } from "@/controllers/tickets-controller";
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";
import { verifyUserAuthorization } from "@/middlewares/verifyUserAuthorization";
import { Router } from "express";

const ticketsRoutes = Router();
const ticketsController = new TicketsController();

ticketsRoutes.use(ensureAuthenticated);

ticketsRoutes.post(
  "/",
  verifyUserAuthorization(["customer"]),
  (req, res, next) => ticketsController.create(req, res, next),
);

ticketsRoutes.get(
  "/customer",
  verifyUserAuthorization(["customer"]),
  (req, res, next) => ticketsController.indexCustomerTickets(req, res, next),
);

ticketsRoutes.get(
  "/customer/:id",
  verifyUserAuthorization(["customer"]),
  (req, res, next) => ticketsController.showTicketCustomer(req, res, next),
);

ticketsRoutes.get(
  "/technician",
  verifyUserAuthorization(["technician"]),
  (req, res, next) => ticketsController.indexTechnicianTickets(req, res, next),
);

ticketsRoutes.get(
  "/technician/:id",
  verifyUserAuthorization(["technician"]),
  (req, res, next) => ticketsController.showTicketTechnician(req, res, next),
);

ticketsRoutes.patch(
  "/:id/status",
  verifyUserAuthorization(["technician", "admin"]),
  (req, res, next) => ticketsController.updateStatus(req, res, next),
);

ticketsRoutes.post(
  "/:id",
  verifyUserAuthorization(["technician"]),
  (req, res, next) => ticketsController.createServiceAdditional(req, res, next),
);

ticketsRoutes.delete(
  "/:id",
  verifyUserAuthorization(["technician"]),
  (req, res, next) => ticketsController.deleteServiceAdditional(req, res, next),
);

ticketsRoutes.get(
  "/admin",
  verifyUserAuthorization(["admin"]),
  (req, res, next) => ticketsController.indexAdminTickets(req, res, next),
);

ticketsRoutes.get(
  "/admin/:id",
  verifyUserAuthorization(["admin"]),
  (req, res, next) => ticketsController.showTicketAdmin(req, res, next),
);

export { ticketsRoutes };
