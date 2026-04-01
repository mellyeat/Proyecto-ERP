function verificarRol(rolesPermitidos) {
    return (req, res, next) => {
        // Asume que verificarSesion se ejecutó antes y req.session.usuario existe
        if (!req.session.usuario) {
            return res.redirect('/login');
        }

        const rolUsuario = req.session.usuario.rol;

        // Si su rol está en el arreglo de permisos, o es un SUPER ADMIN o Admin, déjalo pasar
        if (rolesPermitidos.includes(rolUsuario) || rolUsuario === 'SUPER ADMIN' || rolUsuario === 'admin' || rolUsuario === 'Admin') {
            next();
        } else {
            // Si no tiene permiso, lo botamos al dashboard (su vista segura) o arrojamos 403
            // Res.send podría verse feo, pero es para mantener la rigurosidad
            res.status(403).send("<h1>Acceso Denegado</h1><p>No tienes los permisos de rol ('" + rolesPermitidos.join(', ') + "') necesarios para visualizar este módulo operativo.</p><a href='/dashboard'>Volver al inicio</a>");
        }
    }
}

module.exports = verificarRol;
