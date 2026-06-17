import { AdminController } from "@/controllers/admin-controller";
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";
import { Router } from "express";
import { verifyUserAuthorization } from "@/middlewares/verifyUserAuthorization";

const adminRoutes = Router();
const adminController = new AdminController();

adminRoutes.use(ensureAuthenticated, verifyUserAuthorization(["admin"]));

adminRoutes.get("/customer", (req, res, next) =>
  adminController.indexCustomers(req, res, next),
);
adminRoutes.get("/customer/:id", (req, res, next) =>
  adminController.showCustomer(req, res, next),
);

adminRoutes.patch("/customer/:id", (req, res, next) =>
  adminController.updateCustomer(req, res, next),
);

adminRoutes.delete("/customer/:id", (req, res, next) =>
  adminController.deleteCustomer(req, res, next),
);
adminRoutes.get("/technician", (req, res, next) =>
  adminController.indexTechnician(req, res, next),
);
adminRoutes.get("/technician/:id", (req, res, next) =>
  adminController.showTechnician(req, res, next),
);

adminRoutes.post("/technician", (req, res, next) =>
  adminController.createTechnician(req, res, next),
);

adminRoutes.patch("/technician/:id", (req, res, next) =>
  adminController.updateTechnician(req, res, next),
);

adminRoutes.patch("/technician/delete/:id", (req, res, next) =>
  adminController.deleteTechnician(req, res, next),
);
export { adminRoutes };
