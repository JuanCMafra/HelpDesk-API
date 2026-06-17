import { Request, Response, NextFunction } from "express";
import z, { email } from "zod";
import { AppError } from "@/utils/AppError";
import prisma from "@/database/prisma";
import { DiskStorage } from "@/providers/disk-storage";
import { hash } from "bcrypt";
import { hours } from "@/utils/TechnicianAvailability";

class AdminController {
  async indexCustomers(req: Request, res: Response, next: NextFunction) {
    const showCustomers = await prisma.users.findMany();
    const customerDashboard = showCustomers
      .filter((c) => c.role === "customer")
      .map((c) => ({
        user: { id: c.id, avatar: c.avatar, name: c.name, email: c.email },
      }));
    return res.status(200).json(customerDashboard);
  }

  async showCustomer(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid({ message: "UUID inválido!" }),
    });

    const { id } = paramsSchema.parse(req.params);

    const customer = await prisma.users.findUnique({
      where: { id },
    });

    if (!customer) {
      return next(new AppError("Usuário não encontrado!", 404));
    }

    return res.status(200).json({ user: customer });
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
        .min(5, { message: "Nome e sobrenome devem ter mais de 5 letras!" }),
      email: z.email({ message: "E-mail inválido!" }),
    });

    const { name, email } = bodySchema.parse(req.body);

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
      data: { name, email },
    });

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
        .min(5, { message: "Nome e sobrenome deve ter ter mais de 5 letras!" }),
      email: z.email({ message: "e-mail inválido!" }),
      password: z
        .string()
        .min(6, { message: "A senha deve possuir mais que 6 caracteres!" }),
      availability: z
        .array(z.enum(hours))
        .min(1, { message: "Selecione ao menos um horário!" }),
    });

    const { name, email, password, availability } = bodySchema.parse(req.body);

    const userWithSameEmail = await prisma.users.findFirst({
      where: { email },
    });

    if (userWithSameEmail) {
      return next(new AppError("Um usuário já possui esse e-mail!"));
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

  async indexTechnician(req: Request, res: Response, next: NextFunction) {
    const showTechnician = await prisma.users.findMany({
      include: {
        technician: { select: { availability: true, active: true, id: true } },
      },
    });

    const technicianDashboard = showTechnician
      .filter((c) => c.role === "technician")
      .map((c) => ({
        id: c.technician?.id,
        avatar: c.avatar,
        name: c.name,
        email: c.email,
        active: c.technician?.active,
        availability: c.technician?.availability,
      }));

    return res.status(200).json(technicianDashboard);
  }

  async showTechnician(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const technician = await prisma.technicianProfile.findUnique({
      where: { id },
      include: { user: { select: { avatar: true, email: true, name: true } } },
    });

    if (!technician) {
      return next(new AppError("Técnico não encontrado!", 404));
    }

    const showTechnician = {
      id: technician.id,
      avatar: technician.user.avatar,
      name: technician.user.name,
      email: technician.user.email,
      availability: technician.availability,
      active: technician.active,
    };

    return res.status(200).json(showTechnician);
  }

  async updateTechnician(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const technician = await prisma.technicianProfile.findUnique({
      where: { id },
    });

    if (!technician) {
      return next(new AppError("Técnico não encontrado!", 404));
    }

    const bodySchema = z.object({
      name: z
        .string()
        .trim()
        .min(5, { message: "Nome e sobrenome deve ter mais de 5 letras!" }),
      email: z.email({ message: "E-mail inválido!" }),
      availability: z
        .array(z.enum(hours))
        .min(1, { message: "Selecione ao menos um horário!" }),
    });

    const { name, email, availability } = bodySchema.parse(req.body);

    const technicianSelected = await prisma.users.findFirst({
      where: { technician: { id } },
    });

    if (!technicianSelected) {
      return next(new AppError("Técnico não encontrado!", 404));
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userWithSameEmail = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (userWithSameEmail && userWithSameEmail.id !== technician.userId) {
      return next(new AppError("Esse e-mail já existe!"));
    }

    await prisma.users.update({
      where: {
        id: technician.userId,
      },
      data: {
        name,
        email,
        technician: { update: { availability } },
      },
    });

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
        id,
      },
      include: { user: { select: { avatar: true } } },
    });

    if (!technician) {
      throw new AppError("Técnico não encontrado", 404);
    }

    if (technician.user.avatar) {
      await diskStorage.deleteFile(technician.user.avatar, "upload");
    }

    await prisma.technicianProfile.update({
      where: {
        id,
      },
      data: {
        active: !technician?.active,
      },
    });

    await prisma.users.update({
      where: {
        id: technician.userId,
      },
      data: {
        avatar: null,
      },
    });

    return res.status(200).json();
  }
}

export { AdminController };
