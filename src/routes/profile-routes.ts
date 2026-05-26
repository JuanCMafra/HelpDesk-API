import { ProfileController } from "@/controllers/profile-controller";
import { ensureAuthenticated } from "@/middlewares/ensure-authenticated";
import { Router } from "express";
import uploadConfig from "@/config/upload";
import multer from "multer";

const profileRoutes = Router();
const profileController = new ProfileController();

const upload = multer(uploadConfig.MULTER);

profileRoutes.use(ensureAuthenticated);

profileRoutes.patch("/", (req, res, next) =>
  profileController.update(req, res, next),
);

profileRoutes.patch("/password", (req, res, next) =>
  profileController.updatePassword(req, res, next),
);

profileRoutes.post("/avatar", upload.single("file"), (req, res, next) =>
  profileController.createAvatar(req, res, next),
);

profileRoutes.patch("/avatar", (req, res, next) =>
  profileController.deleteAvatar(req, res, next),
);

export { profileRoutes };
