require('dotenv').config();

const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

async function runMigrations() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        ssl: isProduction
            ? { rejectUnauthorized: false }
            : false,
    });

    const db = drizzle(pool);
    const client = await pool.connect();

try {
    await client.query(`
        GRANT ALL ON SCHEMA public TO ${process.env.DB_USER};
    `);
} finally {
    client.release();
}

    try {
        await migrate(db, {
            migrationsFolder: path.join(__dirname, '..', 'drizzle'),
        });

        console.log('📦 Drizzle migration tamamlandı.');
    } catch (err) {
        console.error('❌ Migration hatası:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    runMigrations().catch(() => {
        process.exitCode = 1;
    });
}

module.exports = { runMigrations };