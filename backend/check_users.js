import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function main() {
  const db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
  const users = await db.all('SELECT email, role FROM users');
  console.log(JSON.stringify(users, null, 2));
  await db.close();
}

main().catch(console.error);
