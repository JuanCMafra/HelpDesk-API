import { Router } from "express";
import { usersRoutes } from "./users-routes";
import { sessionsRoutes } from "./sessions-routes";
import { profileRoutes } from "./profile-routes";
import { adminRoutes } from "./admin-routes";
import { servicesRoutes } from "./service-routes";
import { ticketsRoutes } from "./tickets-routes";

const routes = Router();

routes.use("/users", usersRoutes);
routes.use("/sessions", sessionsRoutes);
routes.use("/profile", profileRoutes);
routes.use("/admin", adminRoutes);
routes.use("/services", servicesRoutes);
routes.use("/tickets", ticketsRoutes);

export { routes };
