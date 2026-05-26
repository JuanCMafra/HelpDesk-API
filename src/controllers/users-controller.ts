import { Request, Response, NextFunction } from "express";
import z from "zod";
import { AppError } from "@/utils/AppError";
import prisma from "@/database/prisma";
import { hash } from "bcrypt";

class UsersController {
  async create(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      name: z
        .string()
        .trim()
        .min(5, "Nome e sobrenome deve ter ter mais de 5 letras!"),
      email: z.email("e-mail inválido!"),
      password: z
        .string()
        .min(6, "A senha deve possuir mais que 6 caracteres!"),
    });

    const { name, email, password } = bodySchema.parse(req.body);

    const userWithSameEmail = await prisma.users.findFirst({
      where: { email },
    });

    if (userWithSameEmail) {
      return next(new AppError("user with same email already exists"));
    }

    const hashedPassword = await hash(password, 8);

    const user = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json(userWithoutPassword);
  }

}

export { UsersController };
