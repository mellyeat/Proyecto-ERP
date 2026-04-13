const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_db',
    connectionLimit: 20,         // Máximo de conexiones simultáneas
    waitForConnections: true,    // Esperar si todas están ocupadas
    queueLimit: 0,               // Sin límite de cola de espera
    connectTimeout: 10000,       // 10s para conectar
    enableKeepAlive: true,       // Mantener conexiones vivas
    keepAliveInitialDelay: 10000 // Ping cada 10s
});

// Verificar que el pool funciona al inicio
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error de conexión al pool MySQL:', err.message);
    } else {
        console.log('Pool MySQL conectado correctamente (' + pool.config.connectionLimit + ' conexiones máx)');
        connection.release();
    }
});

// Manejar errores del pool de forma global
pool.on('error', (err) => {
    console.error('Error inesperado en pool MySQL:', err.message);
});

module.exports = pool;