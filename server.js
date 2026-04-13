require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const session = require('express-session');
const rateLimit = require('express-rate-limit');

// Necesario para que express-rate-limit funcione detrás de proxies (como Railway o Nginx)
app.set('trust proxy', 1);

// ─── Rate Limiting ──────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minuto
    max: 100,                  // 100 peticiones por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }
});
app.use(limiter);

// Rate limit más estricto para login (anti brute force)
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,  // 5 minutos
    max: 15,                   // 15 intentos de login por 5 min
    message: { error: 'Demasiados intentos de login. Espera 5 minutos.' }
});

// ─── Body Limits ────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));

// ─── Configuración de sesiones ──────────────────────────────────────
app.use(session({
    secret: 'llave-secreta',
    resave: false,
    saveUninitialized: false
}));

// ─── Archivos estáticos ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Headers de seguridad ───────────────────────────────────────────
app.use((req, res, next) => {
    // Anti-cache para peticiones dinámicas
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    // Seguridad adicional
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    next();
});

// ─── Motor de vistas ────────────────────────────────────────────────
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// ─── Variables globales para Pug ────────────────────────────────────
app.use((req, res, next) => {
    res.locals.usuario = req.session ? req.session.usuario : null;
    next();
});

// ─── Rutas ──────────────────────────────────────────────────────────
const pagesRouter = require('./routes/pages');
app.use('/', pagesRouter);

// ─── Ruta 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).send(`
        <div style="text-align:center;padding:80px 20px;font-family:system-ui;">
            <h1 style="font-size:4rem;color:#09637e;margin:0;">404</h1>
            <p style="font-size:1.2rem;color:#666;">Página no encontrada</p>
            <a href="/dashboard" style="color:#0883af;">Volver al Dashboard</a>
        </div>
    `);
});

// ─── Manejador de errores global ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err.stack || err.message || err);
    res.status(500).send(`
        <div style="text-align:center;padding:80px 20px;font-family:system-ui;">
            <h1 style="font-size:3rem;color:#c0392b;margin:0;">Error del Servidor</h1>
            <p style="font-size:1.1rem;color:#666;">Algo salió mal. Por favor intenta de nuevo.</p>
            <a href="/dashboard" style="color:#0883af;">Volver al Dashboard</a>
        </div>
    `);
});

// ─── Capturar errores no manejados ──────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('EXCEPCIÓN NO CAPTURADA:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('PROMESA RECHAZADA NO MANEJADA:', reason);
});

// ─── Exportar loginLimiter para uso en rutas ────────────────────────
app.locals.loginLimiter = loginLimiter;

// ─── Iniciar servidor ───────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});