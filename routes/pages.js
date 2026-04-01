const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarSesion = require('../middleware/auth');
const verificarRol = require('../middleware/roles');


router.get('/', (req, res) => {
    res.redirect('/login');
});

// MOSTRAR LOGIN
router.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/dashboard');
    }
    res.render('index');
});

// VALIDAR LOGIN
router.post('/login', (req, res) => {

    const { usuario, password } = req.body;

    db.query(
        "SELECT * FROM empleados_usuarios WHERE usuario = ? AND password = ? AND activo = true",
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
                    error: "Usuario o contraseña incorrectos"
                });
            }
        }
    );
});

// Creacion de registros
router.get('/registro', (req, res) => {
    res.render('registro'); 
});
router.post('/registro', (req, res) => {
    const { usuario, password } = req.body;

    db.query(
        "SELECT * FROM empleados_usuarios WHERE usuario = ?",
        [usuario],
        (err, results) => {
            if (err) {
                console.log(err);
                return res.send("Error");
            }

            if (results.length > 0) {
                return res.render('registro', { error: "El usuario ya está registrado" });
            }

            db.query(
                "INSERT INTO empleados_usuarios (usuario, password, nombre_completo, puesto) VALUES (?, ?, 'Nuevo Usuario', 'Vendedor')",
                [usuario, password],
                (err) => {
                    if (err) {
                        console.log(err);
                        return res.send("Error al registrar");
                    }
                    res.redirect('/');
                }
            );
        }
    );
}); 

// Dashboard
router.get('/dashboard', verificarSesion, (req, res) => {

    db.query("SELECT COUNT(*) AS totalEmpleados FROM empleados_usuarios", (err, empResult) => {
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

router.get('/empleados', verificarSesion, verificarRol(['RH']), (req, res) => {
    db.query("SELECT * FROM empleados_usuarios", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching employees");
        }
        res.render('empleados', { empleados: results });
    });
});

router.post('/empleados/add', verificarSesion, verificarRol(['RH']), (req, res) => {
    const { nombre_completo, usuario, password, puesto, rol, salario } = req.body;
    db.query(
        "INSERT INTO empleados_usuarios (nombre_completo, usuario, password, puesto, rol, salario) VALUES (?, ?, ?, ?, ?, ?)",
        [nombre_completo, usuario, password, puesto, rol, salario || 0],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error adding employee");
            }
            res.redirect('/empleados');
        }
    );
});

router.get('/productos', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    res.render('productos');
});

router.get('/productos/consultas', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    db.query("SELECT * FROM productos", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching products");
        }
        res.render('productos/consultas', { productos: results });
    });
});

router.get('/productos/altas', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    res.render('productos/altas');
});

router.get('/productos/proveedores', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    res.render('productos/proveedores');
});

router.get('/productos/proveedor-altas', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    res.render('productos/proveedor-altas');
});

router.get('/productos/cambios', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    res.render('productos/cambios');
});



router.post('/productos/add', verificarSesion, verificarRol(['COMPRAS']),(req, res) => {
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

router.get('/ventas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('ventas');
});

router.get('/ventas/altas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query("SELECT * FROM productos", (err, productos) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching products");
        }
        res.render('ventas/altas', { productos: productos });
    });
});

router.get('/ventas/consultas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query("SELECT * FROM ventas ORDER BY fecha DESC", (err, ventas) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching sales");
        }
        res.render('ventas/consultas', { ventas: ventas });
    });
});

router.get('/ventas/facturas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('ventas/facturas');
});

router.get('/ventas/factura-view', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('ventas/factura-view');
});

router.get('/ventas/ticket', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('ventas/ticket');
});

// ================== CLIENTES (CRM) ==================
router.get('/clientes', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('clientes');
});

router.get('/clientes/altas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('clientes/altas');
});

router.get('/clientes/consultas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('clientes/consultas');
});

router.get('/clientes/cambios', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('clientes/cambios');
});

// AGREGAR VENTA (PRO)
router.post('/ventas/add', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
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

                        if (req.body.origen === 'compras') {
    res.redirect('/compras');
} else {
    res.redirect('/ventas');
}
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