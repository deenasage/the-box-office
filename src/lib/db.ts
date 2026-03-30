// SPEC: core infrastructure
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = dbUrl.startsWith("file:")
    ? path.resolve(process.cwd(), dbUrl.slice(5))
    : dbUrl;

  const adapter = new PrismaLibSql({ url: `file:${filePath}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
