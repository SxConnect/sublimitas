const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sublimitas',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
  }
  return pool;
}

async function query(sql, params) {
  try {
    const [rows] = await getPool().execute(sql, params);
    return rows;
  } catch (err) {
    console.error('Erro na query:', err.message);
    throw err;
  }
}

async function testConnection() {
  try {
    const conn = await getPool().getConnection();
    console.log('✅ Conexão com MySQL estabelecida');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ Erro ao conectar com MySQL:', err.message);
    return false;
  }
}

module.exports = { getPool, query, testConnection };
