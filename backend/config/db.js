import path from "node:path";
import fs from "node:fs/promises";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import mysql from "mysql2/promise";

import { env } from "./env.js";

let sqliteDb = null;
let mysqlPool = null;

async function getClient() {
  if (env.DB_CLIENT === "sqlite") {
    if (sqliteDb) return sqliteDb;
    const dbFile = env.DB_FILE;
    await fs.mkdir(path.dirname(dbFile), { recursive: true });
    sqliteDb = await open({
      filename: dbFile,
      driver: sqlite3.Database
    });
    await sqliteDb.exec("PRAGMA foreign_keys = ON;");
    return sqliteDb;
  }

  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT ?? 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      connectionLimit: 10,
      namedPlaceholders: true
    });
  }

  return mysqlPool;
}

export async function run(sql, params = {}) {
  const client = await getClient();
  if (env.DB_CLIENT === "sqlite") {
    return client.run(sql, params);
  }
  const [result] = await client.execute(sql, params);
  return result;
}

export async function get(sql, params = {}) {
  const client = await getClient();
  if (env.DB_CLIENT === "sqlite") {
    return client.get(sql, params);
  }
  const [rows] = await client.execute(sql, params);
  return (rows ?? [])[0] ?? null;
}

export async function all(sql, params = {}) {
  const client = await getClient();
  if (env.DB_CLIENT === "sqlite") {
    return client.all(sql, params);
  }
  const [rows] = await client.execute(sql, params);
  return rows ?? [];
}

function splitSqlStatements(sqlText) {
  // Simple splitter for our schema files (no procedures/triggers expected).
  return sqlText
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function initDb() {
  const schemaFile =
    env.DB_CLIENT === "sqlite"
      ? path.join(process.cwd(), "schema.sqlite.sql")
      : path.join(process.cwd(), "schema.mysql.sql");

  const schemaSql = await fs.readFile(schemaFile, "utf8");
  const statements = splitSqlStatements(schemaSql);

  for (const stmt of statements) {
    await run(stmt);
  }

  const { seedDemoUsersIfEmpty, ensureDemoPatientProfileLinked } = await import("./seed.js");
  await seedDemoUsersIfEmpty();
  await ensureDemoPatientProfileLinked();
}

