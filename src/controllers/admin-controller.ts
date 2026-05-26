import { Request, Response, NextFunction } from "express";
import z, { custom } from "zod";
import { AppError } from "@/utils/AppError";
import prisma from "@/database/prisma";
import { DiskStorage } from "@/providers/disk-storage";
import { hash } from "bcrypt";
import { hours } from "@/utils/TechnicianAvailability";

class AdminController {
  async showCustomers(req: Request, res: Response, next: NextFunction) {
    const showCustomers = await prisma.users.findMany();

    const customerDashboard = showCustomers
      .filter((c) => c.role === "customer")
      .map((c) => ({
        avatar: c.avatar,
        name: c.name,
        email: c.email,
      }));
    return res.status(200).json(customerDashboard);
  }

  async updateCustomer(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const customer = await prisma.users.findUnique({
      where: { id },
    });

    if (!customer) {
      return next(new AppError("Usuário não encontrado!", 404));
    }

    const bodySchema = z.object({
      name: z
        .string()
        .trim()
        .min(5, "Nome e sobrenome deve ter mais de 5 letras!")
        .optional(),
      email: z.email("E-mail inválido!").optional(),
    });

    const { name, email } = bodySchema.parse(req.body);

    if (name) {
      await prisma.users.update({
        where: {
          id,
        },
        data: {
          name,
        },
      });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const userWithSameEmail = await prisma.users.findUnique({
        where: { email: normalizedEmail },
      });

      if (userWithSameEmail && userWithSameEmail.id !== id) {
        return next(new AppError("Esse e-mail já existe!"));
      }
      await prisma.users.update({
        where: {
          id,
        },
        data: {
          email,
        },
      });
    }
    return res.status(200).json();
  }

  async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const customer = await prisma.users.findUnique({
      where: { id },
    });

    if (!customer) {
      return next(new AppError("Usuário não encontrado!", 404));
    }

    const diskStorage = new DiskStorage();

    const user = await prisma.users.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado");
    }

    if (user.avatar) {
      await diskStorage.deleteFile(user.avatar, "upload");
    }

    await prisma.users.delete({
      where: {
        id,
      },
    });

    return res.status(200).json();
  }

  async createTechnician(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      name: z
        .string()
        .trim()
        .min(5, "Nome e sobrenome deve ter ter mais de 5 letras!"),
      email: z.email("e-mail inválido!"),
      password: z
        .string()
        .min(6, "A senha deve possuir mais que 6 caracteres!"),
      availability: z
        .array(z.enum(hours))
        .min(1, "Selecione ao menos um horário!"),
    });

    const { name, email, password, availability } = bodySchema.parse(req.body);

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
        role: "technician",
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    const technician = await prisma.technicianProfile.create({
      data: {
        userId: user.id,
        availability,
      },
    });

    return res.status(201).json({ userWithoutPassword, technician });
  }
  
  async showTechnician(req: Request, res: Response, next: NextFunction) {
    const showTechnician = await prisma.users.findMany({
      include: { technician: { select: { availability: true, active: true } } },
    });

    const technicianDashboard = showTechnician
      .filter((c) => c.role === "technician" && c.technician?.active === true)
      .map((c) => ({
        avatar: c.avatar,
        name: c.name,
        email: c.email,
        available: c.technician?.availability,
      }));
    return res.status(200).json(technicianDashboard);
  }

  async updateTechnician(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const technician = await prisma.technicianProfile.findUnique({
      where: { userId: id },
    });

    if (!technician) {
      return next(new AppError("Usuário não encontrado!", 404));
    }

    const bodySchema = z.object({
      name: z
        .string()
        .trim()
        .min(5, "Nome e sobrenome deve ter mais de 5 letras!")
        .optional(),
      email: z.email("E-mail inválido!").optional(),
      availability: z
        .array(z.enum(hours))
        .min(1, "Selecione ao menos um horário!")
        .optional(),
    });

    const { name, email, availability } = bodySchema.parse(req.body);

    if (name) {
      await prisma.users.update({
        where: {
          id,
        },
        data: {
          name,
        },
      });
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const userWithSameEmail = await prisma.users.findUnique({
        where: { email: normalizedEmail },
      });

      if (userWithSameEmail && userWithSameEmail.id !== id) {
        return next(new AppError("Esse e-mail já existe!"));
      }
      await prisma.users.update({
        where: {
          id,
        },
        data: {
          email,
        },
      });
    }

    if (availability) {
      await prisma.technicianProfile.update({
        where: { userId: id },
        data: {
          availability,
        },
      });
    }
    return res.status(200).json();
  }

  async deleteTechnician(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const diskStorage = new DiskStorage();

    const technician = await prisma.technicianProfile.findUnique({
      where: {
        userId: id,
      },
      include: { user: { select: { avatar: true } } },
    });

    if (!technician) {
      throw new AppError("Usuário não encontrado", 404);
    }

    if (technician.user.avatar) {
      await diskStorage.deleteFile(technician.user.avatar, "upload");
    }

    await prisma.technicianProfile.update({
      where: {
        userId: id,
      },
      data: {
        active: false,
      },
    });

    return res.status(200).json();
  }
}

export { AdminController };
