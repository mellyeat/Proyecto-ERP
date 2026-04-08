require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const session = require('express-session');

// configuración de sesiones
app.use(session({
    secret: 'llave-secreta',
    resave: false,
    saveUninitialized: false
}));

// Esto elimina el cache
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

//motor de vistas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

//archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Guardar variables globales en res.locals para Pug
app.use((req, res, next) => {
    res.locals.usuario = req.session ? req.session.usuario : null;
    next();
});

//rutas
const pagesRouter = require('./routes/pages');
app.use('/', pagesRouter);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});