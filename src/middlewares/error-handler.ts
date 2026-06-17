import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/AppError";
import { ZodError } from "zod";

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0]; 

    return res.status(400).json({
      message: firstIssue.message,
      field: String(firstIssue.path[0]),
    });
  }

  console.log(error);

  return res.status(500).json({
    message: error.message,
  });
}
