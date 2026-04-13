const mysql = require('mysql2');

// Soporte para MYSQL_URL (Railway) o variables individuales (local)
const poolConfig = process.env.MYSQL_URL
    ? {
        uri: process.env.MYSQL_URL,
        connectionLimit: 20,
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 10000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'erp_db',
        connectionLimit: 20,
        waitForConnections: true,
        queueLimit: 0,
        connectTimeout: 10000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    };

const pool = mysql.createPool(poolConfig);

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