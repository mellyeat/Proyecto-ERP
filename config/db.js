const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp_db'
});

connection.connect(err => {
    if (err) {
        console.error('Error de conexión:', err);
    } else {
        console.log('Corriendose 🍆💦');
    }
});

module.exports = connection;