import { AppError } from "@/utils/AppError";
import { Request, Response, NextFunction } from "express";

function verifyUserAuthorization(role: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!role.includes(req.user.role)) {
      return next(new AppError("Unauthorized", 401));
    }

    return next();
  };
}

export { verifyUserAuthorization };
