import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/AppError";
import prisma from "@/database/prisma";
import z from "zod";

class ServicesController {
  async create(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      title: z.string().min(6, "O título deve possuir no mínimo 6 letras!"),
      price: z.coerce.number().min(1).positive(),
    });

    const { title, price } = bodySchema.parse(req.body);

    const service = await prisma.services.create({
      data: {
        title,
        price,
      },
    });

    return res.status(201).json({ service });
  }

  async show(req: Request, res: Response, next: NextFunction) {
    const service = await prisma.services.findMany();

    const showServices = service.map((s) => ({
      title: s.title,
      value: s.price,
      status: s.status,
    }));

    return res.status(201).json(showServices);
  }

  async update(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const service = await prisma.services.findUnique({
      where: {
        id,
      },
    });

    const bodySchema = z.object({
      title: z
        .string()
        .min(6, "O título deve possuir no mínimo 6 letras!")
        .optional(),
      price: z.coerce.number().min(1).positive().optional(),
    });

    const { title, price } = bodySchema.parse(req.body);

    if (!service) {
      return next(new AppError("Serviço não encontrado!", 404));
    }

    if (title) {
      await prisma.services.update({
        where: {
          id,
        },

        data: {
          title,
        },
      });
    }

    if (price) {
      await prisma.services.update({
        where: {
          id,
        },

        data: {
          price,
        },
      });
    }

    const updatedService = await prisma.services.findUnique({
      where: { id },
    });

    const showService = {
      title: updatedService?.title,
      price: updatedService?.price,
    };

    return res.status(200).json(showService);
  }

  async status(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const service = await prisma.services.findUnique({
      where: {
        id,
      },
    });

    if (!service) {
      return next(new AppError("Serviço não encontrado!", 404));
    }

    if (service.status === true) {
      await prisma.services.update({
        where: { id },
        data: {
          status: false,
        },
      });
    } else {
      await prisma.services.update({
        where: { id },
        data: {
          status: true,
        },
      });
    }

    const downService = await prisma.services.findUnique({
      where: { id },
    });

    const showService = {
      title: downService?.title,
      price: downService?.price,
      status: downService?.status,
    };

    return res.status(200).json(showService);
  }
}

export { ServicesController };
