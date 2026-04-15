function verificarRol(rolesPermitidos) {
    return (req, res, next) => {
        if (!req.session.usuario) {
            return res.redirect('/login');
        }

        const rolUsuario = req.session.usuario.rol;

        // aqui verificamos el rol del del usuario si lo dejo pasar 
        if (rolesPermitidos.includes(rolUsuario) || rolUsuario === 'SUPER ADMIN' || rolUsuario === 'admin' || rolUsuario === 'Admin') {
            next();
        } else {
            // Si no tiene permiso, lo botamos al dashboard (su vista segura) o arrojamos 403
            // el esa coas del re.sed para rugorosidad
            res.status(403).send("<h1>Acceso Denegado</h1><p>No tienes los permisos de rol ('" + rolesPermitidos.join(', ') + "') necesarios para visualizar este módulo operativo.</p><a href='/dashboard'>Volver al inicio</a>");
        }
    }
}

module.exports = verificarRol;
