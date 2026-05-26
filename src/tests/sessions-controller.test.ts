import "dotenv/config";
import { app } from "@/app";
import prisma from "@/database/prisma";
import request from "supertest";

describe("SessionsController", () => {
  let user_id: string | undefined;

  afterAll(async () => {
    if (user_id) {
      await prisma.users.deleteMany({ where: { id: user_id } });
    }
  });

  it("should authenticate and get access token", async () => {
    const userResponse = await request(app).post("/users").send({
      name: "Auth Test User",
      email: "auth_test_user@example.com",
      password: "password123",
    });

    user_id = userResponse.body.id;

    const sessionsResponse = await request(app).post("/sessions").send({
      email: "auth_test_user@example.com",
      password: "password123",
    });

    expect(sessionsResponse.status).toBe(201)
    expect(sessionsResponse.body.token).toEqual(expect.any(String))
  });
});