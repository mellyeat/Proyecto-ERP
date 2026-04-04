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

// Dashboard
router.get('/dashboard', verificarSesion, (req, res) => {

    db.query("SELECT COUNT(*) AS totalEmpleados FROM empleados_usuarios", (err, empResult) => {
        if (err) console.log(err);

        db.query("SELECT COUNT(*) AS totalProductos FROM productos", (err, prodResult) => {
            if (err) console.log(err);

            db.query("SELECT SUM(total) AS totalVentas FROM ventas", (err, ventasResult) => {
                if (err) console.log(err);

                db.query(`
                    SELECT v.id, c.nombre_comercial AS cliente, p.nombre AS producto, v.total AS monto, v.fecha_emision AS fecha
                    FROM ventas v 
                    LEFT JOIN clientes c ON v.cliente_id = c.id
                    LEFT JOIN venta_detalle vd ON v.id = vd.venta_id
                    LEFT JOIN productos p ON vd.producto_id = p.id
                    ORDER BY v.fecha_emision DESC LIMIT 5
                `, (err, ultimasVentas) => {
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

// ================== EMPLEADOS (RH) ==================
router.get('/empleados', verificarSesion, verificarRol(['RH']), (req, res) => {
    db.query(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN activo=1 THEN 1 ELSE 0 END) AS activos, SUM(CASE WHEN activo=0 THEN 1 ELSE 0 END) AS inactivos, AVG(salario) AS salario_promedio FROM empleados_usuarios",
        (err, metrics) => {
            if (err) console.log(err);
            res.render('empleados/empleados', { metrics: metrics ? metrics[0] : null });
        }
    );
});

router.get('/empleados/consultas', verificarSesion, verificarRol(['RH']), (req, res) => {
    db.query("SELECT * FROM empleados_usuarios ORDER BY fecha_contratacion DESC", (err, results) => {
        if (err) { console.log(err); return res.status(500).send("Error fetching employees"); }
        res.render('empleados/consultas', { empleados: results });
    });
});

router.get('/empleados/altas', verificarSesion, verificarRol(['RH']), (req, res) => {
    res.render('empleados/altas');
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
            res.redirect('/empleados/consultas');
        }
    );
});

router.get('/empleados/cambios', verificarSesion, verificarRol(['RH']), (req, res) => {
    const id = req.query.id;
    db.query("SELECT * FROM empleados_usuarios WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) return res.redirect('/empleados/consultas');
        res.render('empleados/cambios', { empleado: results[0] });
    });
});

router.post('/empleados/edit', verificarSesion, verificarRol(['RH']), (req, res) => {
    const { id, nombre_completo, usuario, puesto, rol, salario, activo } = req.body;
    const activoVal = activo === 'on' ? 1 : 0;
    db.query(
        "UPDATE empleados_usuarios SET nombre_completo=?, usuario=?, puesto=?, rol=?, salario=?, activo=? WHERE id=?",
        [nombre_completo, usuario, puesto, rol, salario || 0, activoVal, id],
        (err) => {
            if (err) { console.log(err); return res.status(500).send("Error updating employee"); }
            res.redirect('/empleados/consultas');
        }
    );
});

router.get('/productos', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    db.query("SELECT COUNT(*) AS total, IFNULL(SUM(stock),0) AS stock_total, SUM(CASE WHEN stock < 10 AND stock > 0 THEN 1 ELSE 0 END) AS bajo_stock, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS sin_stock, SUM(CASE WHEN stock >= 10 THEN 1 ELSE 0 END) AS normal_stock FROM productos", (err, metricRows) => {
        if (err) console.log(err);
        db.query("SELECT id, nombre, stock FROM productos WHERE stock < 10 ORDER BY stock ASC LIMIT 8", (err, lowStock) => {
            if (err) console.log(err);
            var m = metricRows ? metricRows[0] : {};
            res.render('productos', {
                metrics: m,
                lowStockProducts: lowStock || [],
                chartData: JSON.stringify([m.normal_stock || 0, m.bajo_stock || 0, m.sin_stock || 0])
            });
        });
    });
});

router.get('/productos/consultas', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    db.query(`
        SELECT p.*, pr.razon_social AS proveedor_nombre 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
    `, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching products");
        }
        res.render('productos/consultas', { productos: results });
    });
});

router.get('/productos/altas', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    db.query("SELECT id, razon_social FROM proveedores", (err, results) => {
        if (err) console.log(err);
        res.render('productos/altas', { proveedores: results || [] });
    });
});

router.get('/productos/proveedores', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    db.query("SELECT id, razon_social, rfc, categoria, contacto_nombre, telefono, email FROM proveedores", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching proveedores");
        }
        res.render('productos/proveedores', { proveedores: results });
    });
});

router.get('/productos/proveedor-altas', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    res.render('productos/proveedor-altas');
});

router.post('/productos/proveedor-add', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const { empresa, rfc, categoria, contacto, telefono, email } = req.body;
    db.query(
        "INSERT INTO proveedores (razon_social, rfc, categoria, contacto_nombre, telefono, email) VALUES (?, ?, ?, ?, ?, ?)",
        [empresa, rfc, categoria, contacto, telefono, email],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error agregando proveedor");
            }
            res.redirect('/productos/proveedores');
        }
    );
});

router.get('/productos/cambios', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const id = req.query.id;
    db.query("SELECT * FROM productos WHERE id = ?", [id], (err, productResult) => {
        if (err || productResult.length === 0) return res.redirect('/productos/consultas');
        
        db.query("SELECT id, razon_social FROM proveedores", (err, provResults) => {
            res.render('productos/cambios', { 
                producto: productResult[0], 
                proveedores: provResults || [] 
            });
        });
    });
});

router.post('/productos/edit', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const { id, nombre, proveedor, stock, precio } = req.body;
    db.query(
        "UPDATE productos SET nombre=?, proveedor_id=?, stock=?, precio=? WHERE id=?",
        [nombre, proveedor, stock, precio, id],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error actualizando producto");
            }
            res.redirect('/productos/consultas');
        }
    );
});

router.post('/productos/add', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const { nombre, proveedor, stock, precio } = req.body;
    db.query(
        "INSERT INTO productos (nombre, proveedor_id, stock, precio) VALUES (?, ?, ?, ?)",
        [nombre, proveedor, stock, precio],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error adding product");
            }
            res.redirect('/productos/consultas');
        }
    );
});

router.get('/ventas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    // Métricas principales
    db.query(`
        SELECT 
            (SELECT COUNT(*) FROM ventas WHERE DATE(fecha_emision) = CURDATE()) AS ventas_hoy,
            (SELECT IFNULL(SUM(total),0) FROM ventas WHERE MONTH(fecha_emision) = MONTH(NOW()) AND YEAR(fecha_emision) = YEAR(NOW())) AS ingresos_mes,
            (SELECT IFNULL(AVG(total),0) FROM ventas WHERE MONTH(fecha_emision) = MONTH(NOW()) AND YEAR(fecha_emision) = YEAR(NOW())) AS ticket_promedio,
            (SELECT COUNT(DISTINCT cliente_id) FROM ventas WHERE MONTH(fecha_emision) = MONTH(NOW()) AND YEAR(fecha_emision) = YEAR(NOW())) AS clientes_mes
    `, (err, metricRows) => {
        if (err) console.log(err);
        // Top productos vendidos
        db.query(`
            SELECT p.nombre, SUM(vd.cantidad) AS total_vendido
            FROM venta_detalle vd
            JOIN productos p ON vd.producto_id = p.id
            GROUP BY p.nombre ORDER BY total_vendido DESC LIMIT 5
        `, (err, topProducts) => {
            if (err) console.log(err);
            // Ventas por día (últimos 7)
            db.query(`
                SELECT DATE(fecha_emision) AS fecha, SUM(total) AS total_dia
                FROM ventas WHERE fecha_emision >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(fecha_emision) ORDER BY fecha ASC
            `, (err, ventasDia) => {
                if (err) console.log(err);
                res.render('ventas', {
                    metrics: metricRows ? metricRows[0] : {},
                    topProducts: topProducts || [],
                    chartLabels: JSON.stringify((ventasDia || []).map(v => new Date(v.fecha).toLocaleDateString('es-MX', {weekday:'short'}))),
                    chartValues: JSON.stringify((ventasDia || []).map(v => v.total_dia))
                });
            });
        });
    });
});

router.get('/ventas/altas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query("SELECT id, nombre, precio FROM productos WHERE stock > 0", (err, productos) => {
        if (err) console.log(err);
        db.query("SELECT id, nombre_comercial FROM clientes", (err, clientes) => {
            if (err) console.log(err);
            res.render('ventas/altas', { productos: productos || [], clientes: clientes || [] });
        });
    });
});

router.get('/ventas/consultas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query(`
        SELECT v.*, c.nombre_comercial AS cliente_nombre, p.nombre AS producto_nombre, vd.cantidad 
        FROM ventas v 
        LEFT JOIN clientes c ON v.cliente_id = c.id 
        LEFT JOIN venta_detalle vd ON v.id = vd.venta_id 
        LEFT JOIN productos p ON vd.producto_id = p.id 
        ORDER BY v.fecha_emision DESC
    `, (err, ventas) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching sales");
        }
        res.render('ventas/consultas', { ventas: ventas });
    });
});

router.get('/ventas/facturas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query(`
        SELECT 
            v.id, v.subtotal, v.iva, v.total, v.estado,
            v.folio_fiscal, v.fecha_emision,
            c.nombre_comercial AS cliente_nombre
        FROM ventas v
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE v.tipo_comprobante = 'Factura'
        ORDER BY v.fecha_emision DESC
    `, (err, facturas) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error al cargar facturas");
        }
        res.render('ventas/facturas', { facturas: facturas || [] });
    });
});

router.get('/ventas/ticket', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { id } = req.query;
    if (!id) return res.redirect('/ventas/consultas');

    db.query(`
        SELECT 
            v.id, v.subtotal, v.iva, v.total, v.estado, v.fecha_emision,
            c.nombre_comercial  AS cliente_nombre,
            eu.nombre_completo  AS cajero_nombre
        FROM ventas v
        LEFT JOIN clientes           c  ON v.cliente_id  = c.id
        LEFT JOIN empleados_usuarios eu ON v.empleado_id = eu.id
        WHERE v.id = ?
    `, [id], (err, ventaRows) => {
        if (err || !ventaRows.length) {
            console.log(err);
            return res.redirect('/ventas/consultas');
        }

        db.query(`
            SELECT 
                vd.cantidad,
                vd.precio_unitario,
                vd.importe_linea,
                p.nombre AS producto_nombre
            FROM venta_detalle vd
            LEFT JOIN productos p ON vd.producto_id = p.id
            WHERE vd.venta_id = ?
        `, [id], (err, detalles) => {
            if (err) {
                console.log(err);
                return res.redirect('/ventas/consultas');
            }

            res.render('ventas/ticket', {
                venta: ventaRows[0],
                detalles: detalles || []
            });
        });
    });
});

router.get('/ventas/factura-view', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { id } = req.query;
    if (!id) return res.redirect('/ventas/consultas');

    db.query(`
        SELECT 
            v.id, v.subtotal, v.iva, v.total, v.estado,
            v.tipo_comprobante, v.folio_fiscal, v.fecha_emision,
            c.nombre_comercial  AS cliente_nombre,
            c.razon_social      AS cliente_razon_social,
            c.rfc               AS cliente_rfc,
            c.direccion_fiscal  AS cliente_direccion,
            c.email             AS cliente_email,
            c.codigo_postal     AS cliente_cp,
            c.regimen_fiscal    AS cliente_regimen,
            eu.nombre_completo  AS cajero_nombre
        FROM ventas v
        LEFT JOIN clientes           c  ON v.cliente_id  = c.id
        LEFT JOIN empleados_usuarios eu ON v.empleado_id = eu.id
        WHERE v.id = ?
    `, [id], (err, ventaRows) => {
        if (err || !ventaRows.length) {
            console.log(err);
            return res.redirect('/ventas/consultas');
        }

        db.query(`
            SELECT 
                vd.cantidad,
                vd.precio_unitario,
                vd.importe_linea,
                p.nombre AS producto_nombre
            FROM venta_detalle vd
            LEFT JOIN productos p ON vd.producto_id = p.id
            WHERE vd.venta_id = ?
        `, [id], (err, detalles) => {
            if (err) {
                console.log(err);
                return res.redirect('/ventas/consultas');
            }

            res.render('ventas/factura-view', {
                venta: ventaRows[0],
                detalles: detalles || []
            });
        });
    });
});

// ================== CLIENTES (CRM) ==================
router.get('/clientes', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN requiere_factura = 1 THEN 1 ELSE 0 END) AS con_factura
        FROM clientes
    `, (err, metricRows) => {
        if (err) console.log(err);
        // Top clientes por monto total de ventas
        db.query(`
            SELECT c.nombre_comercial, IFNULL(SUM(v.total),0) AS monto_total
            FROM clientes c
            LEFT JOIN ventas v ON c.id = v.cliente_id
            GROUP BY c.id, c.nombre_comercial
            ORDER BY monto_total DESC LIMIT 5
        `, (err, topClientes) => {
            if (err) console.log(err);
            // Clientes registrados por mes (últimos 6 meses) - usamos id como proxy
            db.query(`
                SELECT COUNT(*) AS total FROM clientes
            `, (err, countResult) => {
                if (err) console.log(err);
                var m = metricRows ? metricRows[0] : {};
                res.render('clientes', {
                    totalClientes: m.total || 0,
                    conFactura: m.con_factura || 0,
                    topClientes: topClientes || []
                });
            });
        });
    });
});

router.get('/clientes/altas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    res.render('clientes/altas');
});

router.post('/clientes/add', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { nombre, contacto, telefono, email, requiere_factura, razon_social, rfc, direccion, cp, regimen } = req.body;
    let reqFactura = requiere_factura === 'on' ? 1 : 0;
    
    db.query(
        "INSERT INTO clientes (nombre_comercial, contacto_principal, telefono, email, requiere_factura, razon_social, rfc, direccion_fiscal, codigo_postal, regimen_fiscal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [nombre, contacto, telefono, email, reqFactura, razon_social, rfc, direccion, cp, regimen],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error agregando cliente");
            }
            res.redirect('/clientes/consultas');
        }
    );
});

router.get('/clientes/consultas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query("SELECT * FROM clientes", (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching clientes");
        }
        res.render('clientes/consultas', { clientes: results });
    });
});

router.get('/clientes/cambios', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const id = req.query.id;
    db.query("SELECT * FROM clientes WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/clientes/consultas');
        }
        res.render('clientes/cambios', { cliente: results[0] });
    });
});

router.post('/clientes/edit', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { id, nombre, contacto, telefono, email, requiere_factura, razon_social, rfc, direccion, cp, regimen } = req.body;
    let reqFactura = requiere_factura === 'on' ? 1 : 0;

    db.query(
        "UPDATE clientes SET nombre_comercial=?, contacto_principal=?, telefono=?, email=?, requiere_factura=?, razon_social=?, rfc=?, direccion_fiscal=?, codigo_postal=?, regimen_fiscal=? WHERE id=?",
        [nombre, contacto, telefono, email, reqFactura, razon_social, rfc, direccion, cp, regimen, id],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error actualizando cliente");
            }
            res.redirect('/clientes/consultas');
        }
    );
});

// AGREGAR VENTA (PRO)
router.post('/ventas/add', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { cliente_id, producto_id, cantidad } = req.body;

    db.query("SELECT * FROM productos WHERE id = ?", [producto_id], (err, result) => {
        if (err || result.length === 0) return res.send("Producto no encontrado");

        const prod = result[0];
        if (prod.stock < cantidad) return res.send("Stock insuficiente");

        const subtotal = prod.precio * cantidad;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        const empleado = req.session.usuario ? req.session.usuario.id : null;

        db.query(
            "INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total) VALUES (?, ?, ?, ?, ?)",
            [cliente_id, empleado, subtotal, iva, total],
            (err, ventaResult) => {
                if (err) { console.log(err); return res.status(500).send("Error adding sale"); }
                
                const ventaId = ventaResult.insertId;
                db.query(
                    "INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES (?, ?, ?, ?, ?)",
                    [ventaId, producto_id, cantidad, prod.precio, subtotal],
                    (err) => {
                        db.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [cantidad, producto_id], () => {
                            if (req.body.origen === 'compras') {
                                res.redirect('/compras');
                            } else {
                                res.redirect('/ventas/consultas');
                            }
                        });
                    }
                );
            }
        );
    });
});

// API métricas
router.get('/api/metricas', verificarSesion, (req, res) => {
    db.query(`
        SELECT p.nombre AS producto, SUM(vd.cantidad) as cantidad 
        FROM venta_detalle vd 
        JOIN productos p ON vd.producto_id = p.id 
        GROUP BY p.nombre 
        ORDER BY cantidad DESC 
        LIMIT 5
    `, (err, topProductos) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error fetching metrics" });
        }

        db.query(`
            SELECT DATE(fecha_emision) as fecha, SUM(total) as total 
            FROM ventas 
            WHERE fecha_emision >= DATE(NOW()) - INTERVAL 7 DAY 
            GROUP BY DATE(fecha_emision) 
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

// API – Productos con bajo stock (para campanita de notificaciones)
router.get('/api/low-stock', verificarSesion, (req, res) => {
    db.query(
        "SELECT id, nombre, stock FROM productos WHERE stock < 10 ORDER BY stock ASC LIMIT 20",
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: "Error fetching low-stock" });
            }
            res.json(results || []);
        }
    );
});

// Esta ruta es para cerrar sesión
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;