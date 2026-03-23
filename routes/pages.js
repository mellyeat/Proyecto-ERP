const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarSesion = require('../middleware/auth');

// MOSTRAR LOGIN
router.get('/', (req, res) => {
    res.render('index');
});

// VALIDAR LOGIN
router.post('/', (req, res) => {

    const { usuario, password } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE usuario = ? AND password = ?",
        [usuario, password],
        (err, results) => {

            if (err) {
                return res.send("Error del servidor");
            }

                if (results.length === 1) {
                    req.session.usuario = results[0]; // se guarda el usuario en la sesión
                    res.redirect('/dashboard');
                    } else {
                    res.render('index', {
                    error: "Usuario o contraseña incorrectos ❌"
                });
            }
        }
    );
});

// Dashboard
router.get('/dashboard', verificarSesion, (req, res) => {

    db.query("SELECT COUNT(*) AS totalEmpleados FROM empleados", (err, empResult) => {
        if (err) console.log(err);

        db.query("SELECT COUNT(*) AS totalProductos FROM productos", (err, prodResult) => {
            if (err) console.log(err);

            db.query("SELECT SUM(monto) AS totalVentas FROM ventas", (err, ventasResult) => {
                if (err) console.log(err);

                db.query("SELECT * FROM ventas ORDER BY fecha DESC LIMIT 5", (err, ultimasVentas) => {
                    if (err) console.log(err);

                    res.render('dashboard', {
                        empleados: empResult ? empResult[0].totalEmpleados : 0,
                        productos: prodResult ? prodResult[0].totalProductos : 0,
                        ventas: ventasResult && ventasResult[0].totalVentas ? ventasResult[0].totalVentas : 0,
                        listaVentas: ultimasVentas || []
                    });

                });
            });
        });
    });

});

// Empleados
router.get('/empleados', verificarSesion, (req, res) => {
    db.query("SELECT * FROM empleados", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching employees");
        }
        res.render('empleados', { empleados: results });
    });
});

router.post('/empleados/add', verificarSesion, (req, res) => {
    const { nombre, puesto, salario } = req.body;
    db.query(
        "INSERT INTO empleados (nombre, puesto, salario) VALUES (?, ?, ?)",
        [nombre, puesto, salario],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error adding employee");
            }
            res.redirect('/empleados');
        }
    );
});

// Productos
router.get('/productos', verificarSesion, (req, res) => {
    db.query("SELECT * FROM productos", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching products");
        }
        res.render('productos', { productos: results });
    });
});

router.post('/productos/add', verificarSesion,(req, res) => {
    const { nombre, stock, precio } = req.body;
    db.query(
        "INSERT INTO productos (nombre, stock, precio) VALUES (?, ?, ?)",
        [nombre, stock, precio],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error adding product");
            }
            res.redirect('/productos');
        }
    );
});

// VENTAS (CORREGIDO)
router.get('/ventas', verificarSesion, (req, res) => {

    db.query("SELECT * FROM ventas ORDER BY fecha DESC", (err, ventas) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching sales");
        }

        db.query("SELECT * FROM productos", (err, productos) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error fetching products");
            }

            res.render('ventas', {
                ventas: ventas,
                productos: productos
            });

        });
    });
});

// AGREGAR VENTA (PRO)
router.post('/ventas/add', verificarSesion, (req, res) => {
    const { cliente, producto, monto, cantidad } = req.body;

    db.query("SELECT * FROM productos WHERE nombre = ?", [producto], (err, result) => {
        if (err || result.length === 0) {
            return res.send("Producto no encontrado");
        }

        const prod = result[0];

        // Validar stock
        if (prod.stock < cantidad) {
            return res.send("Stock insuficiente");
        }

        // Insertar venta
        db.query(
            "INSERT INTO ventas (cliente, producto, monto) VALUES (?, ?, ?)",
            [cliente, producto, monto],
            (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error adding sale");
                }

                // Descontar stock
                db.query(
                    "UPDATE productos SET stock = stock - ? WHERE nombre = ?",
                    [cantidad, producto],
                    (err) => {
                        if (err) console.log(err);

                        res.redirect('/ventas');
                    }
                );
            }
        );
    });
});

// API métricas
router.get('/api/metricas', verificarSesion, (req, res) => {
    db.query("SELECT producto, COUNT(*) as cantidad FROM ventas GROUP BY producto ORDER BY cantidad DESC LIMIT 5", (err, topProductos) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error fetching metrics" });
        }

        db.query(`
            SELECT DATE(fecha) as fecha, SUM(monto) as total 
            FROM ventas 
            WHERE fecha >= DATE(NOW()) - INTERVAL 7 DAY 
            GROUP BY DATE(fecha) 
            ORDER BY fecha ASC
        `, (err, ventasPorDia) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: "Error fetching metrics" });
            }

            res.json({
                topProductos,
                ventasPorDia
            });
        });
    });
});

// Esta ruta es para cerrar sesión
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;