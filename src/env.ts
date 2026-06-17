import dotenv from "dotenv";
dotenv.config();
import z from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().default(3333),
  ADMIN_PASSWORD: z.string().trim().min(5),
});

const env = envSchema.parse(process.env);

export { env };
