const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarSesion = require('../middleware/auth');
const verificarRol = require('../middleware/roles');
const { validateBody, validateParamId, validateQueryId, sanitize, ROLES_VALIDOS, ESTADOS_FACTURA } = require('../middleware/validators');


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
router.post('/login',
    validateBody({
        usuario:  { required: true, label: 'Usuario' },
        password: { required: true, label: 'Contraseña' }
    }),
    (req, res) => {

    const { usuario, password } = req.body;

    db.query(
        "SELECT * FROM empleados_usuarios WHERE usuario = ? AND password = ? AND activo = true",
        [usuario, password],
        (err, results) => {

            if (err) {
                return res.send("Error del servidor");
            }

            if (results.length === 1) {
                req.session.usuario = results[0]; 
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

//  EMPLEADOS (esto solo lo ve RH)
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

router.post('/empleados/add', verificarSesion, verificarRol(['RH']),
    validateBody({
        nombre_completo: { required: true, label: 'Nombre completo' },
        usuario:         { required: true, minLength: 3, label: 'Usuario' },
        password:        { required: true, minLength: 4, label: 'Contraseña' },
        rol:             { required: true, oneOf: ROLES_VALIDOS, label: 'Rol' },
        salario:         { nonNegative: true, label: 'Salario' }
    }),
    (req, res) => {
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

router.post('/empleados/edit', verificarSesion, verificarRol(['RH']),
    validateBody({
        id:              { required: true, validId: true, label: 'ID del empleado' },
        nombre_completo: { required: true, label: 'Nombre completo' },
        usuario:         { required: true, minLength: 3, label: 'Usuario' },
        rol:             { required: true, oneOf: ROLES_VALIDOS, label: 'Rol' },
        salario:         { nonNegative: true, label: 'Salario' }
    }),
    (req, res) => {
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
    db.query(`
        SELECT p.id, p.razon_social, p.rfc, p.categoria, p.contacto_nombre, p.telefono, p.email,
               COUNT(pr.id) AS total_productos
        FROM proveedores p
        LEFT JOIN productos pr ON pr.proveedor_id = p.id
        GROUP BY p.id
    `, (err, results) => {
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

router.post('/productos/proveedor-add', verificarSesion, verificarRol(['COMPRAS']),
    validateBody({
        empresa:  { required: true, label: 'Razón Social' },
        contacto: { required: true, label: 'Nombre del Contacto' },
        email:    { required: true, email: true, label: 'Correo Electrónico' },
        rfc:      { rfc: true, label: 'RFC' },
        telefono: { phone: true, label: 'Teléfono' }
    }),
    (req, res) => {
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

// Editar proveedor 
router.get('/productos/proveedor-cambios', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const id = req.query.id;
    if (!id) return res.redirect('/productos/proveedores');
    db.query("SELECT * FROM proveedores WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) return res.redirect('/productos/proveedores');
        res.render('productos/proveedor-cambios', { proveedor: results[0] });
    });
});

// Editar proveedor esto en gurdado los cambios
router.post('/productos/proveedor-edit', verificarSesion, verificarRol(['COMPRAS']),
    validateBody({
        id:       { required: true, validId: true, label: 'ID del proveedor' },
        empresa:  { required: true, label: 'Razón Social' },
        contacto: { required: true, label: 'Nombre del Contacto' },
        email:    { required: true, email: true, label: 'Correo Electrónico' },
        rfc:      { rfc: true, label: 'RFC' },
        telefono: { phone: true, label: 'Teléfono' }
    }),
    (req, res) => {
    const { id, empresa, rfc, categoria, contacto, telefono, email } = req.body;
    db.query(
        "UPDATE proveedores SET razon_social=?, rfc=?, categoria=?, contacto_nombre=?, telefono=?, email=? WHERE id=?",
        [empresa, rfc, categoria, contacto, telefono, email, id],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error actualizando proveedor");
            }
            res.redirect('/productos/proveedores');
        }
    );
});

// Eliminar proveedor
router.post('/productos/proveedor-delete/:id', verificarSesion, verificarRol(['COMPRAS']), validateParamId('id'), (req, res) => {
    const id = req.params.id;
    // quitamos los productos que el proveedor o se los designamos
    db.query("UPDATE productos SET proveedor_id = NULL WHERE proveedor_id = ?", [id], (err) => {
        if (err) console.log(err);
        db.query("DELETE FROM proveedores WHERE id = ?", [id], (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error eliminando proveedor");
            }
            res.redirect('/productos/proveedores');
        });
    });
});

// nos traemos los productos con metodo ajax
router.get('/api/proveedor-productos', verificarSesion, (req, res) => {
    const id = req.query.id;
    if (!id) return res.json([]);
    db.query("SELECT id, nombre, stock, precio FROM productos WHERE proveedor_id = ?", [id], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error fetching products" });
        }
        res.json(results || []);
    });
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

router.post('/productos/edit', verificarSesion, verificarRol(['COMPRAS']),
    validateBody({
        id:       { required: true, validId: true, label: 'ID del producto' },
        nombre:   { required: true, label: 'Nombre del producto' },
        proveedor:{ required: true, validId: true, label: 'Proveedor' },
        stock:    { required: true, nonNegativeInt: true, label: 'Stock' },
        precio:   { required: true, positive: true, label: 'Precio' }
    }),
    (req, res) => {
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

router.post('/productos/add', verificarSesion, verificarRol(['COMPRAS']),
    validateBody({
        nombre:   { required: true, label: 'Nombre del producto' },
        proveedor:{ required: true, validId: true, label: 'Proveedor' },
        stock:    { required: true, nonNegativeInt: true, label: 'Stock' },
        precio:   { required: true, positive: true, label: 'Precio' }
    }),
    (req, res) => {
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

// Eliminar producto
router.post('/productos/delete/:id', verificarSesion, verificarRol(['COMPRAS']), validateParamId('id'), (req, res) => {
    const id = req.params.id;
    const referer = req.get('Referer') || '/productos/consultas';
    // Desvinculamos de venta_detalle para no romper integridad referencial
    db.query("UPDATE venta_detalle SET producto_id = NULL WHERE producto_id = ?", [id], (err) => {
        if (err) console.log(err);
        db.query("UPDATE cotizacion_detalle SET producto_id = NULL WHERE producto_id = ?", [id], (err) => {
            if (err) console.log(err);
            db.query("DELETE FROM productos WHERE id = ?", [id], (err) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send("Error eliminando producto");
                }
                res.redirect(referer);
            });
        });
    });
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

// Cambiar estatus de factura con ajax
router.post('/ventas/facturas/cambiar-estado', verificarSesion, verificarRol(['VENTAS']),
    validateBody({
        id:     { required: true, validId: true, label: 'ID de factura' },
        estado: { required: true, oneOf: ESTADOS_FACTURA, label: 'Estado' }
    }),
    (req, res) => {
    const { id, estado } = req.body;

    db.query(
        "UPDATE ventas SET estado = ? WHERE id = ? AND tipo_comprobante = 'Factura'",
        [estado, id],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Error actualizando estado' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }
            res.json({ success: true, estado: estado });
        }
    );
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

// CLIENTES (CRM)
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

router.post('/clientes/add', verificarSesion, verificarRol(['VENTAS']),
    validateBody({
        nombre:   { required: true, label: 'Nombre Comercial' },
        email:    { required: true, email: true, label: 'Correo Electrónico' },
        telefono: { phone: true, label: 'Teléfono' },
        rfc:      { rfc: true, label: 'RFC' },
        cp:       { cp: true, label: 'Código Postal' }
    }),
    (req, res) => {
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

router.post('/clientes/edit', verificarSesion, verificarRol(['VENTAS']),
    validateBody({
        id:       { required: true, validId: true, label: 'ID del cliente' },
        nombre:   { required: true, label: 'Nombre Comercial' },
        email:    { required: true, email: true, label: 'Correo Electrónico' },
        telefono: { phone: true, label: 'Teléfono' },
        rfc:      { rfc: true, label: 'RFC' },
        cp:       { cp: true, label: 'Código Postal' }
    }),
    (req, res) => {
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

// AGREGAR VENTA
router.post('/ventas/add', verificarSesion, verificarRol(['VENTAS']),
    validateBody({
        cliente_id:  { required: true, validId: true, label: 'Cliente' },
        producto_id: { required: true, validId: true, label: 'Producto' },
        cantidad:    { required: true, positiveInt: true, label: 'Cantidad' }
    }),
    (req, res) => {
    const { cliente_id, producto_id, cantidad, generar_factura } = req.body;

    db.query("SELECT * FROM productos WHERE id = ?", [producto_id], (err, result) => {
        if (err || result.length === 0) return res.send("Producto no encontrado");

        const prod = result[0];
        if (prod.stock < cantidad) return res.send("Stock insuficiente");

        const subtotal = prod.precio * cantidad;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        const empleado = req.session.usuario ? req.session.usuario.id : null;

        // Determinar tipo de comprobante según checkbox de factura
        const quiereFactura = generar_factura === 'si';
        const tipoComprobante = quiereFactura ? 'Factura' : 'Ticket';
        const estadoVenta = quiereFactura ? 'Pendiente' : 'Pagada';

        // Generar folio fiscal si es factura (formato UUID simplificado)
        let folioFiscal = null;
        if (quiereFactura) {
            const hex = () => Math.random().toString(16).substring(2, 6);
            folioFiscal = `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`.toUpperCase();
        }

        db.query(
            "INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, tipo_comprobante, estado, folio_fiscal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [cliente_id, empleado, subtotal, iva, total, tipoComprobante, estadoVenta, folioFiscal],
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


// COTIZACIONES
router.get('/cotizaciones/consultas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query(`
        SELECT c.*, cl.nombre_comercial AS cliente_nombre 
        FROM cotizaciones c 
        LEFT JOIN clientes cl ON c.cliente_id = cl.id 
        ORDER BY c.fecha_emision DESC
    `, (err, cotizaciones) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error fetching cotizaciones");
        }
        res.render('cotizaciones/consultas', { cotizaciones: cotizaciones || [] });
    });
});

router.get('/cotizaciones/altas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    db.query("SELECT id, nombre, precio FROM productos WHERE stock > 0", (err, productos) => {
        if (err) console.log(err);
        db.query("SELECT id, nombre_comercial FROM clientes", (err, clientes) => {
            if (err) console.log(err);
            res.render('cotizaciones/altas', { productos: productos || [], clientes: clientes || [] });
        });
    });
});

router.post('/cotizaciones/add', verificarSesion, verificarRol(['VENTAS']),
    validateBody({
        cliente_id:   { required: true, validId: true, label: 'Cliente' },
        producto_id:  { required: true, validId: true, label: 'Producto' },
        cantidad:     { required: true, positiveInt: true, label: 'Cantidad' },
        vigencia_dias:{ required: true, positiveInt: true, label: 'Vigencia (días)' }
    }),
    (req, res) => {
    const { cliente_id, producto_id, cantidad, vigencia_dias } = req.body;

    db.query("SELECT * FROM productos WHERE id = ?", [producto_id], (err, result) => {
        if (err || result.length === 0) return res.send("Producto no encontrado");

        const prod = result[0];
        const subtotal = prod.precio * cantidad;
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        const empleado = req.session.usuario ? req.session.usuario.id : null;
        let vigencia = vigencia_dias || 15;

        db.query(
            "INSERT INTO cotizaciones (cliente_id, empleado_id, subtotal, iva, total, vigencia_dias) VALUES (?, ?, ?, ?, ?, ?)",
            [cliente_id, empleado, subtotal, iva, total, vigencia],
            (err, cotiResult) => {
                if (err) { console.log(err); return res.status(500).send("Error adding cotización"); }
                
                const cotiId = cotiResult.insertId;
                db.query(
                    "INSERT INTO cotizacion_detalle (cotizacion_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES (?, ?, ?, ?, ?)",
                    [cotiId, producto_id, cantidad, prod.precio, subtotal],
                    (err) => {
                        res.redirect('/cotizaciones/consultas');
                    }
                );
            }
        );
    });
});

router.get('/cotizaciones/view', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { id } = req.query;
    if (!id) return res.redirect('/cotizaciones/consultas');

    db.query(`
        SELECT 
            c.*,
            cl.nombre_comercial  AS cliente_nombre,
            cl.razon_social      AS cliente_razon_social,
            cl.rfc               AS cliente_rfc,
            cl.direccion_fiscal  AS cliente_direccion,
            cl.email             AS cliente_email,
            eu.nombre_completo   AS cajero_nombre
        FROM cotizaciones c
        LEFT JOIN clientes cl ON c.cliente_id = cl.id
        LEFT JOIN empleados_usuarios eu ON c.empleado_id = eu.id
        WHERE c.id = ?
    `, [id], (err, cotiRows) => {
        if (err || !cotiRows.length) {
            console.log(err);
            return res.redirect('/cotizaciones/consultas');
        }

        db.query(`
            SELECT 
                cd.cantidad, cd.precio_unitario, cd.importe_linea, p.nombre AS producto_nombre
            FROM cotizacion_detalle cd
            LEFT JOIN productos p ON cd.producto_id = p.id
            WHERE cd.cotizacion_id = ?
        `, [id], (err, detalles) => {
            if (err) console.log(err);
            res.render('cotizaciones/view', {
                cotizacion: cotiRows[0],
                detalles: detalles || []
            });
        });
    });
});

router.get('/cotizaciones/convertir', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const { id } = req.query;
    if (!id) return res.redirect('/cotizaciones/consultas');

    db.query("SELECT * FROM cotizaciones WHERE id = ? AND estado = 'Pendiente'", [id], (err, cotiResult) => {
        if (err || cotiResult.length === 0) return res.redirect('/cotizaciones/consultas');
        const coti = cotiResult[0];

        db.query("SELECT * FROM cotizacion_detalle WHERE cotizacion_id = ?", [id], (err, detalles) => {
            if (err || detalles.length === 0) return res.redirect('/cotizaciones/consultas');
            const det = detalles[0]; // currently single item supported

            // Check stock first
            db.query("SELECT stock FROM productos WHERE id = ?", [det.producto_id], (err, prodResult) => {
                if (err || prodResult.length === 0 || prodResult[0].stock < det.cantidad) {
                    return res.send("Error: Stock insuficiente para convertir esta cotización.");
                }

                db.query(
                    "INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, tipo_comprobante) VALUES (?, ?, ?, ?, ?, 'Ticket')",
                    [coti.cliente_id, coti.empleado_id, coti.subtotal, coti.iva, coti.total],
                    (err, ventaResult) => {
                        if (err) return res.status(500).send("Error creating sale from quote");
                        const ventaId = ventaResult.insertId;

                        db.query(
                            "INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES (?, ?, ?, ?, ?)",
                            [ventaId, det.producto_id, det.cantidad, det.precio_unitario, det.importe_linea],
                            (err) => {
                                db.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [det.cantidad, det.producto_id], () => {
                                    db.query("UPDATE cotizaciones SET estado = 'Convertida' WHERE id = ?", [id], () => {
                                        res.redirect('/ventas/consultas');
                                    });
                                });
                            }
                        );
                    }
                );
            });
        });
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

// ─── ENDPOINTS DE BÚSQUEDA (SEARCH API) ───────────────────────────────

// Búsqueda de Ventas
router.get('/api/search/ventas', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    db.query(`
        SELECT v.*, c.nombre_comercial AS cliente_nombre, p.nombre AS producto_nombre, vd.cantidad 
        FROM ventas v 
        LEFT JOIN clientes c ON v.cliente_id = c.id 
        LEFT JOIN venta_detalle vd ON v.id = vd.venta_id 
        LEFT JOIN productos p ON vd.producto_id = p.id 
        WHERE v.id LIKE ? OR c.nombre_comercial LIKE ? OR p.nombre LIKE ? OR v.folio_fiscal LIKE ?
        ORDER BY v.fecha_emision DESC
    `, [q, q, q, q], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en búsqueda" });
        }
        res.json(results || []);
    });
});

// Búsqueda de Productos
router.get('/api/search/productos', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    db.query(`
        SELECT p.*, pr.razon_social AS proveedor_nombre 
        FROM productos p 
        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id 
        WHERE p.nombre LIKE ? OR p.id LIKE ? OR pr.razon_social LIKE ?
        ORDER BY p.nombre ASC
    `, [q, q, q], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en búsqueda" });
        }
        res.json(results || []);
    });
});

// Búsqueda de Clientes
router.get('/api/search/clientes', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    db.query(`
        SELECT * FROM clientes 
        WHERE nombre_comercial LIKE ? OR rfc LIKE ? OR email LIKE ? OR telefono LIKE ?
        ORDER BY nombre_comercial ASC
    `, [q, q, q, q], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en búsqueda" });
        }
        res.json(results || []);
    });
});

// Búsqueda de Empleados
router.get('/api/search/empleados', verificarSesion, verificarRol(['RH']), (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    db.query(`
        SELECT * FROM empleados_usuarios 
        WHERE nombre_completo LIKE ? OR usuario LIKE ? OR puesto LIKE ? OR rol LIKE ?
        ORDER BY nombre_completo ASC
    `, [q, q, q, q], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en búsqueda" });
        }
        res.json(results || []);
    });
});

// Búsqueda de Cotizaciones
router.get('/api/search/cotizaciones', verificarSesion, verificarRol(['VENTAS']), (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    db.query(`
        SELECT c.*, cl.nombre_comercial AS cliente_nombre 
        FROM cotizaciones c 
        LEFT JOIN clientes cl ON c.cliente_id = cl.id 
        WHERE c.id LIKE ? OR cl.nombre_comercial LIKE ? OR c.estado LIKE ?
        ORDER BY c.fecha_emision DESC
    `, [q, q, q], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en búsqueda" });
        }
        res.json(results || []);
    });
});

// Búsqueda de Proveedores
router.get('/api/search/proveedores', verificarSesion, verificarRol(['COMPRAS']), (req, res) => {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    db.query(`
        SELECT p.id, p.razon_social, p.rfc, p.categoria, p.contacto_nombre, p.telefono, p.email,
               COUNT(pr.id) AS total_productos
        FROM proveedores p
        LEFT JOIN productos pr ON pr.proveedor_id = p.id
        WHERE p.razon_social LIKE ? OR p.rfc LIKE ? OR p.contacto_nombre LIKE ? OR p.email LIKE ?
        GROUP BY p.id
        ORDER BY p.razon_social ASC
    `, [q, q, q, q], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Error en búsqueda" });
        }
        res.json(results || []);
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