import express from "express";
import { errorHandler } from "./middlewares/error-handler";
import { routes } from "./routes";
import uploadConfig from "@/config/upload"

const app = express();

app.use(express.json());

app.use("/profile/avatar", express.static(uploadConfig.UPLOADS_FOLDER))

app.use(routes)

app.use(errorHandler)

export { app };
