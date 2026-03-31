// SPEC: core infrastructure
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  let adapter: PrismaLibSql;
  if (dbUrl.startsWith("file:")) {
    const filePath = path.resolve(process.cwd(), dbUrl.slice(5)).split(path.sep).join("/");
    adapter = new PrismaLibSql({ url: `file:${filePath}` });
  } else {
    adapter = new PrismaLibSql({ url: dbUrl, authToken });
  }

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
