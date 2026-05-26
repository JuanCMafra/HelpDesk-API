import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/database/prisma";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config/auth";
import { hash } from "bcrypt";

describe("TicketsController", () => {
  const testEmailClient = "customer_tickets_test@test.com";
  const testEmailTech = "tech_tickets_test@test.com";
  const testEmailAdmin = "admin_tickets_test@test.com";
  const serviceTitle = "tickets_controller_test_service_base";

  let clientToken: string;
  let techToken: string;
  let adminToken: string;

  let clientId: string;
  let techUserId: string;
  let techProfileId: string;
  let serviceBaseId: string;

  beforeAll(async () => {
    const { secret, expiresIn } = authConfig.jwt;
    const hashedPassword = await hash("password123", 8);

    await prisma.ticketsServices.deleteMany({ where: { title: serviceTitle } });
    await prisma.tickets.deleteMany({
      where: {
        OR: [
          { client: { email: testEmailClient } },
          { technician: { user: { email: testEmailTech } } },
        ],
      },
    });
    await prisma.technicianProfile.deleteMany({
      where: { user: { email: testEmailTech } },
    });
    await prisma.services.deleteMany({ where: { title: serviceTitle } });
    await prisma.users.deleteMany({
      where: {
        email: { in: [testEmailClient, testEmailTech, testEmailAdmin] },
      },
    });

    const serviceBase = await prisma.services.create({
      data: { title: serviceTitle, price: 150.0, status: true },
    });
    serviceBaseId = serviceBase.id;

    const clientUser = await prisma.users.create({
      data: {
        name: "Client Test",
        email: testEmailClient,
        password: hashedPassword,
        role: "customer",
      },
    });
    clientId = clientUser.id;
    clientToken = jwt.sign({ role: clientUser.role }, secret, {
      subject: String(clientId),
      expiresIn,
    });

    const techUser = await prisma.users.create({
      data: {
        name: "Tech Test",
        email: testEmailTech,
        password: hashedPassword,
        role: "technician",
      },
    });
    techUserId = techUser.id;
    techToken = jwt.sign({ role: techUser.role }, secret, {
      subject: String(techUserId),
      expiresIn,
    });

    const techProfile = await prisma.technicianProfile.create({
      data: { userId: techUserId, active: true },
    });
    techProfileId = techProfile.id;

    const adminUser = await prisma.users.create({
      data: {
        name: "Admin Test",
        email: testEmailAdmin,
        password: hashedPassword,
        role: "admin",
      },
    });
    adminToken = jwt.sign({ role: adminUser.role }, secret, {
      subject: String(adminUser.id),
      expiresIn,
    });
  });

  afterAll(async () => {
    await prisma.ticketsServices.deleteMany({ where: { title: serviceTitle } });
    await prisma.tickets.deleteMany({
      where: {
        OR: [{ clientId: clientId }, { technicianId: techProfileId }],
      },
    });
    await prisma.technicianProfile.deleteMany({ where: { id: techProfileId } });
    await prisma.services.deleteMany({ where: { id: serviceBaseId } });
    await prisma.users.deleteMany({
      where: {
        email: { in: [testEmailClient, testEmailTech, testEmailAdmin] },
      },
    });
    await prisma.$disconnect();
  });

  describe("POST /tickets", () => {
    it("should create a ticket and generate a base service record inside transaction", async () => {
      const response = await request(app)
        .post("/tickets")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          title: "Setup de PC Gamer completo",
          description: "Montagem de hardware e instalação de OS",
          service: serviceBaseId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("ticketNumber");
      expect(response.body.title).toBe("Setup de PC Gamer completo");
      expect(response.body.status).toBe("open");
      expect(response.body.technicianName).toBe("Tech Test");
    });

    it("should return 404 if the base service does not exist or is inactive", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post("/tickets")
        .set("Authorization", `Bearer ${clientToken}`)
        .send({
          title: "Suporte Técnico",
          service: fakeUuid,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Serviço base não encontrado!");
    });
  });

  describe("GET /tickets/customer & /tickets/technician & /tickets/admin", () => {
    it("should list dashboard tickets filtered and sorted for the authenticated customer", async () => {
      const response = await request(app)
        .get("/tickets/customer")
        .set("Authorization", `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const currentTicket = response.body.find(
        (t: any) => t.title === "Setup de PC Gamer completo",
      );
      expect(currentTicket).toBeDefined();
      expect(currentTicket.technician).toBe("Tech Test");
      expect(typeof currentTicket.total).toBe("number");
    });

    it("should list dashboard tickets for the assigned technician", async () => {
      const response = await request(app)
        .get("/tickets/technician")
        .set("Authorization", `Bearer ${techToken}`);

      expect(response.status).toBe(200);
      const currentTicket = response.body.find(
        (t: any) => t.title === "Setup de PC Gamer completo",
      );
      expect(currentTicket).toBeDefined();
      expect(currentTicket.client).toBe("Client Test");
    });
  });
  describe("GET /tickets/:role/:id", () => {
    it("should return detailed ticket data for customer view", async () => {
      const createdTicket = await prisma.tickets.findFirst({
        where: { clientId, title: "Setup de PC Gamer completo" },
      });

      const response = await request(app)
        .get(`/tickets/customer/${createdTicket?.ticketNumber}`)
        .set("Authorization", `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Setup de PC Gamer completo");
      expect(response.body.category).toBe(serviceTitle);
      expect(response.body).toHaveProperty("total");
    });
  });

  describe("PATCH /tickets/:id/status", () => {
    it("should progress status from open to in_progress", async () => {
      const createdTicket = await prisma.tickets.findFirst({
        where: { clientId, title: "Setup de PC Gamer completo" },
      });

      const response = await request(app)
        .patch(`/tickets/${createdTicket?.ticketNumber}/status`)
        .set("Authorization", `Bearer ${techToken}`)
        .send({ status: "in_progress" });

      expect(response.status).toBe(204);

      const updated = await prisma.tickets.findUnique({
        where: { id: createdTicket?.id },
      });
      expect(updated?.status).toBe("in_progress");
    });

    it("should block invalid status transition (in_progress directly back to open)", async () => {
      const createdTicket = await prisma.tickets.findFirst({
        where: { clientId, title: "Setup de PC Gamer completo" },
      });

      const response = await request(app)
        .patch(`/tickets/${createdTicket?.ticketNumber}/status`)
        .set("Authorization", `Bearer ${techToken}`)
        .send({ status: "open" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Transição de status inválida!");
    });
  });

  describe("POST & DELETE /tickets/:id (Additional Services)", () => {
    let additionalServiceUuid: string;

    it("should allow a technician to attach an additional service cost to the ticket", async () => {
      const createdTicket = await prisma.tickets.findFirst({
        where: { clientId, title: "Setup de PC Gamer completo" },
      });

      const response = await request(app)
        .post(`/tickets/${createdTicket?.ticketNumber}`)
        .set("Authorization", `Bearer ${techToken}`)
        .send({
          title: "Pasta Térmica Premium Noctua",
          price: 65.0,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe("additional");
      expect(response.body.title).toBe("Pasta Térmica Premium Noctua");

      additionalServiceUuid = response.body.id;
    });

    it("should allow a technician to remove an additional service cost from the ticket", async () => {
      const response = await request(app)
        .delete(`/tickets/${additionalServiceUuid}`)
        .set("Authorization", `Bearer ${techToken}`);

      expect(response.status).toBe(200);

      const deletedCheck = await prisma.ticketsServices.findUnique({
        where: { id: additionalServiceUuid },
      });
      expect(deletedCheck).toBeNull();
    });
  });
});
