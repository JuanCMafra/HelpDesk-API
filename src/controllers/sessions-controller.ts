import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/AppError";
import { authConfig } from "@/config/auth";
import prisma from "@/database/prisma";
import { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import z from "zod";

class SessionsController {
  async create(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      email: z.email(),
      password: z.string().min(6),
    });

    const { email, password } = bodySchema.parse(req.body);

    const user = await prisma.users.findFirst({
      where: { email },
      include: { technician: { select: { active: true, availability: true } } },
    });

    if (!user) {
      return next(new AppError("E-mail ou senha inválido!", 401));
    }

    if (user.technician?.active === false) {
      return next(new AppError("Usuário desativado, por favor, contacte o administrador!", 401));
    }

    const passwordMatched = await compare(password, user.password);

    if (!passwordMatched) {
      return next(new AppError("E-mail ou senha inválido!", 401));
    }

    const { secret, expiresIn } = authConfig.jwt;

    const token = jwt.sign({ role: user.role ?? "member" }, secret, {
      subject: String(user.id),
      expiresIn: expiresIn,
    });

    const { password: hashedPassword, ...userWithoutPassword } = user;

    return res.status(201).json({ token, user: userWithoutPassword });
  }
}

export { SessionsController };
