const express = require('express');
const router = express.Router();
const db = require('../config/db');

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
router.get('/dashboard', (req, res) => {

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

module.exports = router;