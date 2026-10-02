import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://pb:pb@localhost:5432/podzemnye_bogatstva',
});
