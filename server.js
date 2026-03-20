const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

//motor de vistas
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

//archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//rutas
const pagesRouter = require('./routes/pages');
app.use('/', pagesRouter);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});