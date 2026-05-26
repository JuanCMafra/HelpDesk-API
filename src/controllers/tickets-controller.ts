import { Request, Response, NextFunction } from "express";
import prisma from "@/database/prisma";
import z from "zod";
import { AppError } from "@/utils/AppError";

class TicketsController {
  async create(req: Request, res: Response, next: NextFunction) {
    const bodySchema = z.object({
      title: z
        .string()
        .min(4, "Por Favor, adicione um título válido ao chamado!"),
      description: z.string().min(5, "Descrição incompleta!").optional(),
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
      updatedAt: t.updatedAt,
      id: t.ticketNumber,
      title: t.title,

      service: t.services.find((s) => s.type === "base")?.title,

      total: t.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),

      technicianAvatar: t.technician.user.avatar,
      technician: t.technician.user.name,

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
        new Date(a.updatedAt || 0).getTime() -
        new Date(b.updatedAt || 0).getTime()
      );
    });

    return res.json(ticketsDashboard);
  }

  async showTicketCustomer(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.coerce.number().min(1, "Id inválido!").positive("Id inválido!"),
    });

    const { id } = paramsSchema.parse(req.params);

    const ticket = await prisma.tickets.findFirst({
      where: { ticketNumber: id, clientId: req.user?.id },
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
      id: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.services.find((s) => s.type === "base")?.title,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,

      technician: ticket.technician.user.name,
      technician_avatar: ticket.technician.user.avatar,
      technician_email: ticket.technician.user.email,

      base_value: ticket.services
        .find((s) => s.type === "base")
        ?.price.toNumber(),
      additional_values: ticket.services
        .filter((s) => s.type === "additional")
        .map((v) => ({
          title: v.title,
          price: v.price.toNumber(),
        })),
    };

    const total =
      (showTicket.base_value || 0) +
      showTicket.additional_values.reduce(
        (total, value) => total + value.price,
        0,
      );

    return res.json({ ...showTicket, total });
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
      id: t.ticketNumber,
      title: t.title,
      service: t.services.find((s) => s.type === "base")?.title,
      updatedAt: t.updatedAt,
      total: t.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),

      clientAvatar: t.client.avatar,
      client: t.client.name,

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
        new Date(a.updatedAt || 0).getTime() -
        new Date(b.updatedAt || 0).getTime()
      );
    });

    return res.json(ticketsDashboard);
  }

  async showTicketTechnician(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.coerce.number().min(1, "Id inválido!").positive("Id inválido!"),
    });

    const { id } = paramsSchema.parse(req.params);

    const ticket = await prisma.tickets.findFirst({
      where: { ticketNumber: id, technician: { userId: req.user?.id } },
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
      id: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.services.find((s) => s.type === "base")?.title,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,

      client: ticket.client.name,
      client_avatar: ticket.client.avatar,

      additional_services: ticket.services
        .filter((s) => s.type === "additional")
        .map((v) => ({
          title: v.title,
          price: v.price.toNumber(),
        })),

      technician: ticket.technician.user.name,
      technician_avatar: ticket.technician.user.avatar,
      technician_email: ticket.technician.user.email,

      base_value: ticket.services
        .find((s) => s.type === "base")
        ?.price.toNumber(),
      additional_values: ticket.services
        .filter((s) => s.type === "additional")
        .reduce((total, value) => total + value.price.toNumber(), 0),
    };

    const total =
      (showTicket.base_value || 0) +
      showTicket.additional_services.reduce(
        (total, value) => total + value.price,
        0,
      );

    return res.json({ ...showTicket, total });
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.coerce.number().min(1, "Id inválido!").positive("Id inválido!"),
    });

    const { id } = paramsSchema.parse(req.params);

    const bodySchema = z.object({
      status: z.enum(["open", "in_progress", "close"], "Status Inválido!"),
    });

    const { status } = bodySchema.parse(req.body);

    const ticket = await prisma.tickets.findFirst({
      where: { ticketNumber: id },
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
      open: ["in_progress"],
      in_progress: ["close"],
      close: ["open"],
    };

    const canChange = allowedTransitions[ticket.status].includes(status);

    if (!canChange) {
      return next(new AppError("Transição de status inválida!", 400));
    }

    const newStatus = await prisma.tickets.update({
      where: { ticketNumber: id },
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
      id: z.coerce.number().min(1, "Id inválido!").positive("Id inválido!"),
    });

    const { id } = paramsSchema.parse(req.params);

    const bodySchema = z.object({
      title: z
        .string()
        .min(4, "Por Favor, adicione um título válido ao serviço!"),
      price: z.number().min(1, "Valor inválido!").positive("Valor inválido!"),
    });

    const { title, price } = bodySchema.parse(req.body);

    const ticket = await prisma.tickets.findFirst({
      where: { ticketNumber: id, technician: { userId: req.user?.id } },
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
      updatedAt: t.updatedAt,
      id: t.ticketNumber,
      title: t.title,
      service: t.services.find((s) => s.type === "base")?.title,
      total: t.services.reduce(
        (total, service) => total + service.price.toNumber(),
        0,
      ),

      clientAvatar: t.client.avatar,
      client: t.client.name,

      technicianAvatar: t.technician.user.avatar,
      technician: t.technician.user.name,

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
        new Date(a.updatedAt || 0).getTime() -
        new Date(b.updatedAt || 0).getTime()
      );
    });

    return res.json(ticketsDashboard);
  }

  async showTicketAdmin(req: Request, res: Response, next: NextFunction) {
    const paramsSchema = z.object({
      id: z.coerce.number().min(1, "Id inválido!").positive("Id inválido!"),
    });

    const { id } = paramsSchema.parse(req.params);

    const ticket = await prisma.tickets.findFirst({
      where: { ticketNumber: id },
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
      id: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.services.find((s) => s.type === "base")?.title,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,

      client: ticket.client.name,
      client_avatar: ticket.client.avatar,

      technician: ticket.technician.user.name,
      technician_avatar: ticket.technician.user.avatar,
      technician_email: ticket.technician.user.email,

      base_value: ticket.services
        .find((s) => s.type === "base")
        ?.price.toNumber(),
      additional_services: ticket.services
        .filter((s) => s.type === "additional")
        .map((v) => ({
          title: v.title,
          price: v.price.toNumber(),
        })),
    };

    const total =
      (showTicket.base_value || 0) +
      showTicket.additional_services.reduce(
        (total, value) => total + value.price,
        0,
      );

    return res.json({ ...showTicket, total });
  }
}

export { TicketsController };
