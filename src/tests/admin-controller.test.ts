import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";
import request from "supertest";
import { app } from "@/app";
import prisma from "@/database/prisma";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config/auth";
import { hash } from "bcrypt";

describe("AdminController", () => {
  let adminToken: string;
  const adminEmail = "admin_test@helpdesk.com";

  const testEmails = [
    adminEmail,
    "client@test.com",
    "tech@test.com",
    "update@test.com",
    "um@test.com",
    "dois@test.com",
    "delete@test.com",
    "newtech@test.com",
    "active@test.com",
    "inactive@test.com",
    "soft@test.com",
  ];

  beforeAll(async () => {
    const { secret, expiresIn } = authConfig.jwt;

    await prisma.ticketsServices.deleteMany({
      where: { ticket: { client: { email: { in: testEmails } } } },
    });
    await prisma.tickets.deleteMany({
      where: {
        OR: [
          { client: { email: { in: testEmails } } },
          { technician: { user: { email: { in: testEmails } } } },
        ],
      },
    });
    await prisma.technicianProfile.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.users.deleteMany({
      where: { email: { in: testEmails } },
    });

    const hashedPassword = await hash("admin123", 8);

    const adminUser = await prisma.users.create({
      data: {
        name: "Admin do Sistema",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      },
    });

    adminToken = jwt.sign({ role: adminUser.role }, secret, {
      subject: String(adminUser.id),
      expiresIn,
    });
  });

  beforeEach(async () => {
    await prisma.ticketsServices.deleteMany({
      where: { ticket: { client: { email: { in: testEmails } } } },
    });
    await prisma.tickets.deleteMany({
      where: {
        OR: [
          { client: { email: { in: testEmails } } },
          { technician: { user: { email: { in: testEmails } } } },
        ],
      },
    });

    await prisma.technicianProfile.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });

    await prisma.users.deleteMany({
      where: {
        email: {
          in: testEmails,
          not: adminEmail,
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.ticketsServices.deleteMany({
      where: { ticket: { client: { email: { in: testEmails } } } },
    });
    await prisma.tickets.deleteMany({
      where: {
        OR: [
          { client: { email: { in: testEmails } } },
          { technician: { user: { email: { in: testEmails } } } },
        ],
      },
    });
    await prisma.technicianProfile.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });

    await prisma.users.deleteMany({
      where: { email: { in: testEmails } },
    });

    await prisma.$disconnect();
  });

  // --- TESTES DE CUSTOMERS ---

  describe("GET /admin/customer (showCustomers)", () => {
    it("should list only users with customer role", async () => {
      await prisma.users.createMany({
        data: [
          {
            name: "User Customer",
            email: "client@test.com",
            password: "123",
            role: "customer",
          },
          {
            name: "User Tech",
            email: "tech@test.com",
            password: "123",
            role: "technician",
          },
        ],
      });

      const response = await request(app)
        .get("/admin/customer")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const testCustomer = response.body.find(
        (user: any) => user.email === "client@test.com",
      );

      expect(testCustomer).toBeDefined();
      expect(testCustomer.name).toBe("User Customer");
      expect(testCustomer).not.toHaveProperty("password");

      const testTech = response.body.find(
        (user: any) => user.email === "tech@test.com",
      );
      expect(testTech).toBeUndefined();
    });
  });

  describe("PATCH /admin/customer/:id (updateCustomer)", () => {
    it("should update customer name successfully", async () => {
      const customer = await prisma.users.create({
        data: {
          name: "Antigo Nome",
          email: "update@test.com",
          password: "123",
          role: "customer",
        },
      });

      const response = await request(app)
        .patch(`/admin/customer/${customer.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Novo Nome Sobrenome" });

      expect(response.status).toBe(200);

      const updatedUser = await prisma.users.findUnique({
        where: { id: customer.id },
      });
      expect(updatedUser?.name).toBe("Novo Nome Sobrenome");
    });

    it("should return 400 if trying to update to an email that already exists", async () => {
      const customer1 = await prisma.users.create({
        data: {
          name: "Customer Um",
          email: "um@test.com",
          password: "123",
          role: "customer",
        },
      });
      await prisma.users.create({
        data: {
          name: "Customer Dois",
          email: "dois@test.com",
          password: "123",
          role: "customer",
        },
      });

      const response = await request(app)
        .patch(`/admin/customer/${customer1.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "dois@test.com" });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /admin/customer/:id (deleteCustomer)", () => {
    it("should permanently delete a customer", async () => {
      const customer = await prisma.users.create({
        data: {
          name: "Delete Me",
          email: "delete@test.com",
          password: "123",
          role: "customer",
        },
      });

      const response = await request(app)
        .delete(`/admin/customer/${customer.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const searchDeleted = await prisma.users.findUnique({
        where: { id: customer.id },
      });
      expect(searchDeleted).toBeNull();
    });
  });

  // --- TESTES DE TECHNICIANS ---

  describe("POST /admin/technician (createTechnician)", () => {
    it("should create a technician and their profile successfully", async () => {
      const response = await request(app)
        .post("/admin/technician")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Novo Tecnico",
          email: "newtech@test.com",
          password: "password123",
          availability: ["09:00", "10:00"],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("technician");
      expect(response.body.technician.availability).toEqual(["09:00", "10:00"]);
      expect(response.body.userWithoutPassword.role).toBe("technician");
    });
  });

  describe("GET /admin/technician (showTechnician)", () => {
    it("should list only active technicians", async () => {
      const techActive = await prisma.users.create({
        data: {
          name: "Tech Ativo",
          email: "active@test.com",
          password: "123",
          role: "technician",
        },
      });
      await prisma.technicianProfile.create({
        data: { userId: techActive.id, availability: ["09:00"], active: true },
      });

      const techInactive = await prisma.users.create({
        data: {
          name: "Tech Inativo",
          email: "inactive@test.com",
          password: "123",
          role: "technician",
        },
      });
      await prisma.technicianProfile.create({
        data: {
          userId: techInactive.id,
          availability: ["10:00"],
          active: false,
        },
      });

      const response = await request(app)
        .get("/admin/technician")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const activeTechResult = response.body.find(
        (tech: any) => tech.email === "active@test.com",
      );
      expect(activeTechResult).toBeDefined();

      const inactiveTechResult = response.body.find(
        (tech: any) => tech.email === "inactive@test.com",
      );
      expect(inactiveTechResult).toBeUndefined();
    });
  });

  describe("PATCH /admin/technician/delete/:id (deleteTechnician)", () => {
    it("should perform a soft-delete on technician profile by setting active to false", async () => {
      const tech = await prisma.users.create({
        data: {
          name: "Soft Delete Tech",
          email: "soft@test.com",
          password: "123",
          role: "technician",
        },
      });
      await prisma.technicianProfile.create({
        data: { userId: tech.id, availability: ["11:00"], active: true },
      });

      const response = await request(app)
        .patch(`/admin/technician/delete/${tech.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const userExists = await prisma.users.findUnique({
        where: { id: tech.id },
      });
      expect(userExists).not.toBeNull();

      const profile = await prisma.technicianProfile.findUnique({
        where: { userId: tech.id },
      });
      expect(profile?.active).toBe(false);
    });
  });
});
