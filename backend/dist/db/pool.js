import mysql from "mysql2/promise";
import { loadConfig } from "../config.js";
let pool = null;
export function getPool() {
    if (pool)
        return pool;
    const cfg = loadConfig();
    pool = mysql.createPool({
        host: cfg.DB_HOST,
        port: cfg.DB_PORT,
        user: cfg.DB_USER,
        password: cfg.DB_PASSWORD,
        database: cfg.DB_NAME,
        connectionLimit: 10,
        namedPlaceholders: true
    });
    return pool;
}
