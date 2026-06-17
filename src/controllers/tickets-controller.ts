import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import z from "zod";
import { AppError } from "@/utils/AppError";
import dayjs from "dayjs";

class TicketsController {
  async create(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      title: z
        .string()
        .min(4, "Por Favor, adicione um título válido ao chamado!"),
      description: z.string().optional(),
      service: z.uuid(),
    });

    const { title, description, service } = bodySchema.parse(req.body);

    const serviceBase = await prisma.services.findUnique({
      where: { id: service, status: true },
    });

    if (!serviceBase) {
      return next(new AppError("Serviço base não encontrado!", 404));
    }

    const technician = await prisma.technicianProfile.findFirst({
      where: {
        active: true,
      },

      orderBy: [
        {
          tickets: {
            _count: "asc",
          },
        },

        {
          createdAt: "desc",
        },
      ],
    });

    const ticket = await prisma.$transaction(async (tx) => {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      if (!technician) {
        throw new AppError("Nenhum técnico disponível!", 404);
      }

      const ticket = await tx.tickets.create({
        data: {
          title,
          description,
          clientId: req.user.id,
          technicianId: technician.id,
        },

        include: {
          technician: { select: { user: { select: { name: true } } } },
        },
      });

      await tx.ticketsServices.create({
        data: {
          ticketId: ticket.id,
          serviceId: service,
          title: serviceBase.title,
          price: serviceBase.price,
          type: "base",
        },
      });

      return ticket;
    });

    const showTicket = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      ticketNumber: ticket.ticketNumber,
      technicianId: ticket.technicianId,
      technicianName: ticket.technician.user.name,
    };

    return res.status(201).json(showTicket);
  }

  async indexCustomerTickets(req: Request, res: Response, next: NextFunction) {
    const showTickets = await prisma.tickets.findMany({
      where: {
        clientId: req.user?.id,

        services: {
          some: {
            type: "base",
          },
        },
      },

      include: {
        services: {
          select: {
            title: true,
            price: true,
            type: true,
          },
        },

        technician: {
          select: { user: { select: { avatar: true, name: true } } },
        },
      },

      orderBy: {
        updatedAt: "asc",
      },
    });

    const ticketsDashboard = showTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      title: t.title,
      updated_at: dayjs(t.updatedAt).format("DD-MM-YYYY HH:mm"),

      technician: {
        name: t.technician.user.name,
        avatar: t.technician.user.avatar,
      },

      service: t.services.map((s) => ({
        title: s.title,
        price: s.price.toNumber(),
        type: s.type,
      })),

      total: t.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),

      status: t.status,
    }));

    const statusOrder = {
      open: 0,
      in_progress: 1,
      close: 2,
    };

    [...ticketsDashboard].sort((a, b) => {
      const statusComparison = statusOrder[a.status] - statusOrder[b.status];

      if (statusComparison !== 0) {
        return statusComparison;
      }

      return (
        new Date(a.updated_at || 0).getTime() -
        new Date(b.updated_at || 0).getTime()
      );
    });

    return res.json(ticketsDashboard);
  }

  async showTicketCustomer(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid({ message: "ID Inválido!" }),
    });

    const { id } = paramsSchema.parse(req.params);

    const ticket = await prisma.tickets.findFirst({
      where: {
        id,
        clientId: req.user?.id,
      },
      include: {
        client: { select: { id: true } },
        services: true,
        technician: {
          select: {
            user: { select: { name: true, avatar: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      return next(new AppError("Chamado não encontrado!", 404));
    }

    const showTicket = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.services.find((s) => s.type === "base")?.title,
      created_at: dayjs(ticket.createdAt).format("DD-MM-YYYY HH:mm"),
      updated_at: dayjs(ticket.updatedAt).format("DD-MM-YYYY HH:mm"),
      status: ticket.status,

      technician: {
        name: ticket.technician.user.name,
        avatar: ticket.technician.user.avatar,
        email: ticket.technician.user.email,
      },

      base_value: ticket.services
        .find((s) => s.type === "base")
        ?.price.toNumber(),
      additional_values: ticket.services
        .filter((s) => s.type === "additional")
        .map((v) => ({
          title: v.title,
          price: v.price.toNumber(),
        })),

      service: ticket.services.map((s) => ({
        id: s.id,
        title: s.title,
        price: s.price.toNumber(),
        type: s.type,
      })),

      total: ticket.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),
    };

    return res.json(showTicket);
  }

  async indexTechnicianTickets(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const showTickets = await prisma.tickets.findMany({
      where: {
        technician: { userId: req.user?.id },

        services: {
          some: {
            type: "base",
          },
        },
      },

      include: {
        services: {
          select: {
            title: true,
            price: true,
            type: true,
          },
        },

        client: { select: { avatar: true, name: true } },
      },

      orderBy: {
        updatedAt: "asc",
      },
    });

    const ticketsDashboard = showTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber as unknown as string,
      title: t.title,
      service: t.services.map((s) => ({
        title: s.title,
        price: s.price.toNumber(),
        type: s.type,
      })),
      updated_at: dayjs(t.updatedAt).format("DD-MM-YYYY HH:mm"),
      total: t.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),

      client: {
        name: t.client.name,
        avatar: t.client.avatar,
      },

      status: t.status,
    }));

    const statusOrder = {
      open: 0,
      in_progress: 1,
      close: 2,
    };

    ticketsDashboard.sort((a, b) => {
      const statusComparison = statusOrder[a.status] - statusOrder[b.status];

      if (statusComparison !== 0) {
        return statusComparison;
      }

      return (
        new Date(a.updated_at || 0).getTime() -
        new Date(b.updated_at || 0).getTime()
      );
    });

    return res.json(ticketsDashboard);
  }

  async showTicketTechnician(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid({ message: "ID Inválido!" }),
    });

    const { id } = paramsSchema.parse(req.params);

    const ticket = await prisma.tickets.findFirst({
      where: { id, technician: { userId: req.user?.id } },
      include: {
        client: { select: { avatar: true, name: true } },
        services: true,
        technician: {
          select: {
            user: { select: { name: true, avatar: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      return next(new AppError("Chamado não encontrado!", 404));
    }

    const showTicket = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.services.find((s) => s.type === "base")?.title,
      created_at: dayjs(ticket.createdAt).format("DD-MM-YYYY HH:mm"),
      updated_at: dayjs(ticket.updatedAt).format("DD-MM-YYYY HH:mm"),
      service: ticket.services.map((s) => ({
        id: s.id,
        title: s.title,
        price: s.price.toNumber(),
        type: s.type,
      })),
      status: ticket.status,
      client: {
        name: ticket.client.name,
        avatar: ticket.client.avatar,
      },

      additional_services: ticket.services
        .filter((s) => s.type === "additional")
        .map((v) => ({
          title: v.title,
          price: v.price.toNumber(),
        })),

      technician: {
        name: ticket.technician.user.name,
        avatar: ticket.technician.user.avatar,
        email: ticket.technician.user.email,
      },

      base_value: ticket.services
        .find((s) => s.type === "base")
        ?.price.toNumber(),
      additional_value: ticket.services
        .filter((s) => s.type === "additional")
        .reduce((total, value) => total + value.price.toNumber(), 0),

      total: ticket.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),
    };

    return res.json(showTicket);
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid({ message: "ID Inválido!" }),
    });

    const { id } = paramsSchema.parse(req.params);

    const bodySchema = z.object({
      status: z.enum(["open", "in_progress", "close"], {
        message: "Status Inválido!",
      }),
    });

    const { status } = bodySchema.parse(req.body);

    const ticket = await prisma.tickets.findFirst({
      where: { id },
      include: { technician: { select: { userId: true } } },
    });

    if (!ticket) {
      throw new AppError("Chamado não encontrado!", 404);
    }

    if (
      req.user?.id !== ticket?.technician.userId &&
      req.user?.role === "technician"
    ) {
      throw new AppError("Chamado não encontrado!", 404);
    }

    const allowedTransitions = {
      open: ["in_progress", "close"],
      in_progress: ["close"],
      close: ["open"],
    };

    const canChange = allowedTransitions[ticket.status].includes(status);

    if (!canChange) {
      return next(new AppError("Transição de status inválida!", 400));
    }

    const newStatus = await prisma.tickets.update({
      where: { id },
      data: { status },
    });

    return res.status(204).json(newStatus);
  }

  async createServiceAdditional(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const bodySchema = z.object({
      title: z.string().min(4, {
        message: "Por Favor, adicione um título válido ao serviço!",
      }),
      price: z
        .number()
        .min(1, { message: "Valor inválido!" })
        .positive({ message: "Valor inválido!" }),
    });

    const { title, price } = bodySchema.parse(req.body);

    const ticket = await prisma.tickets.findFirst({
      where: { id, technician: { userId: req.user?.id } },
      include: { technician: { select: { userId: true } } },
    });

    if (!ticket) {
      throw new AppError("Chamado não encontrado!", 404);
    }

    const additionalService = await prisma.ticketsServices.create({
      data: {
        ticketId: ticket.id,
        title,
        price,
        type: "additional",
      },
    });

    return res.json(additionalService);
  }

  async deleteServiceAdditional(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const paramsSchema = z.object({
      id: z.uuid(),
    });

    const { id } = paramsSchema.parse(req.params);

    const additionalService = await prisma.ticketsServices.findUnique({
      where: { id, ticket: { technician: { userId: req.user?.id } } },
    });

    if (!additionalService) {
      return next(new AppError("Serviço adicional não encontrado!", 404));
    }

    await prisma.ticketsServices.delete({
      where: { id },
    });

    return res.json(additionalService);
  }

  async indexAdminTickets(req: Request, res: Response, next: NextFunction) {
    const showTickets = await prisma.tickets.findMany({
      where: {
        services: {
          some: {
            type: "base",
          },
        },
      },

      include: {
        services: {
          select: {
            title: true,
            price: true,
            type: true,
          },
        },

        client: { select: { avatar: true, name: true } },
        technician: {
          select: { user: { select: { avatar: true, name: true } } },
        },
      },

      orderBy: { updatedAt: "asc" },
    });

    const ticketsDashboard = showTickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber as unknown as string,
      title: t.title,
      service: t.services.map((s) => ({
        title: s.title,
        price: s.price.toNumber(),
        type: s.type,
      })),
      updated_at: dayjs(t.updatedAt).format("DD-MM-YYYY HH:mm"),
      total: t.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),

      client: {
        name: t.client.name,
        avatar: t.client.avatar,
      },

      technician: {
        name: t.technician.user.name,
        avatar: t.technician.user.avatar,
      },

      status: t.status,
    }));

    const statusOrder = {
      open: 0,
      in_progress: 1,
      close: 2,
    };

    ticketsDashboard.sort((a, b) => {
      const statusComparison = statusOrder[a.status] - statusOrder[b.status];

      if (statusComparison !== 0) {
        return statusComparison;
      }

      return (
        new Date(a.updated_at || 0).getTime() -
        new Date(b.updated_at || 0).getTime()
      );
    });

    return res.json(ticketsDashboard);
  }

  async showTicketAdmin(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.uuid({ message: "ID Inválido!" }),
    });

    const { id } = paramsSchema.parse(req.params);

    const ticket = await prisma.tickets.findFirst({
      where: { id },
      include: {
        client: { select: { avatar: true, name: true } },
        services: true,
        technician: {
          select: {
            user: { select: { name: true, avatar: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      return next(new AppError("Chamado não encontrado!", 404));
    }

    const showTicket = {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.services.find((s) => s.type === "base")?.title,
      created_at: dayjs(ticket.createdAt).format("DD-MM-YYYY HH:mm"),
      updated_at: dayjs(ticket.updatedAt).format("DD-MM-YYYY HH:mm"),
      service: ticket.services.map((s) => ({
        id: s.id,
        title: s.title,
        price: s.price.toNumber(),
        type: s.type,
      })),
      status: ticket.status,
      client: {
        name: ticket.client.name,
        avatar: ticket.client.avatar,
      },

      additional_services: ticket.services
        .filter((s) => s.type === "additional")
        .map((v) => ({
          title: v.title,
          price: v.price.toNumber(),
        })),

      technician: {
        name: ticket.technician.user.name,
        avatar: ticket.technician.user.avatar,
        email: ticket.technician.user.email,
      },

      base_value: ticket.services
        .find((s) => s.type === "base")
        ?.price.toNumber(),
      additional_value: ticket.services
        .filter((s) => s.type === "additional")
        .reduce((total, value) => total + value.price.toNumber(), 0),

      total: ticket.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),
    };

    return res.json(showTicket);
  }
}

export { TicketsController };
