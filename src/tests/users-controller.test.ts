import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { app } from "../app";
import request from "supertest";
import prisma from "../database/prisma";

describe("SessionsController", () => {
  let user_id: string | undefined;

  afterAll(async () => {
    if (user_id) {
      await prisma.users.deleteMany({ where: { id: user_id } });
    }
  });

  it("should create a new user successfully", async () => {
    const uniqueEmail = `testuser+${Date.now()}@example.com`;
    const response = await request(app).post("/users").send({
      name: "Test User",
      email: uniqueEmail,
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Test User");

    user_id = response.body.id;
  });

  it("should throw a validation error if email id invalid", async () => {
    const response = await request(app).post("/users").send({
      name: "Test User",
      email: "invalid-email",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("should throw an error if user with same email already exist", async () => {
    const response = await request(app).post("/users").send({
      name: "Duplicate User",
      email: "testuser@example.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("user with same email already exists");
  });
});
