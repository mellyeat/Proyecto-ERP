const db = require('./config/db');

const crearTablas = async () => {
    try {
        await new Promise((resolve, reject) => {
            db.query(`
                CREATE TABLE IF NOT EXISTS cotizaciones (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cliente_id INT,
                    empleado_id INT,
                    subtotal DECIMAL(10,2) DEFAULT 0.00,
                    iva DECIMAL(10,2) DEFAULT 0.00,
                    total DECIMAL(10,2) DEFAULT 0.00,
                    estado VARCHAR(50) DEFAULT 'Pendiente',
                    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
                    vigencia_dias INT DEFAULT 15,
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
                    FOREIGN KEY (empleado_id) REFERENCES empleados_usuarios(id) ON DELETE SET NULL
                )
            `, (err) => {
                if(err) reject(err);
                else resolve();
            });
        });
        
        await new Promise((resolve, reject) => {
            db.query(`
                CREATE TABLE IF NOT EXISTS cotizacion_detalle (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    cotizacion_id INT,
                    producto_id INT,
                    cantidad INT DEFAULT 1,
                    precio_unitario DECIMAL(10,2) DEFAULT 0.00,
                    importe_linea DECIMAL(10,2) DEFAULT 0.00,
                    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
                    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
                )
            `, (err) => {
                if(err) reject(err);
                else resolve();
            });
        });

        console.log("Tablas creadas exitosamente!");
        process.exit(0);
    } catch(err) {
        console.error("Error creando tablas: ", err);
        process.exit(1);
    }
};

crearTablas();
