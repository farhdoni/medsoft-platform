import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'migrations') });
  console.log('Migrations complete.');

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
