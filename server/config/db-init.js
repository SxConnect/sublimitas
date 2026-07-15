require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { getPool } = require('./db');

async function initDatabase() {
  console.log('🗄️  Inicializando banco de dados...');

  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Conectar sem database para poder criar
  const tempPool = require('mysql2/promise').createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await tempPool.execute(stmt);
      }
    }
    console.log('✅ Schema aplicado com sucesso');
  } catch (err) {
    console.error('❌ Erro ao aplicar schema:', err.message);
    throw err;
  } finally {
    await tempPool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('Banco inicializado com sucesso');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
