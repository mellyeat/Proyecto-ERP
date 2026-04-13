-- ==========================================
-- MIGRACIÓN COMPLETA PARA DEPLOY EN LA NUBE
-- Ejecutar en la base de datos de Railway
-- ==========================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS cotizacion_detalle;
DROP TABLE IF EXISTS cotizaciones;
DROP TABLE IF EXISTS venta_detalle;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS proveedores;
DROP TABLE IF EXISTS empleados_usuarios;
DROP TABLE IF EXISTS empleados;
DROP TABLE IF EXISTS usuarios;

-- ── TABLA: EMPLEADOS/USUARIOS ──
CREATE TABLE empleados_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150),
    usuario VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    rol VARCHAR(50),
    puesto VARCHAR(100),
    salario DECIMAL(10,2),
    activo BOOLEAN DEFAULT TRUE,
    fecha_contratacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── TABLA: PROVEEDORES ──
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    razon_social VARCHAR(150),
    rfc VARCHAR(13),
    categoria VARCHAR(100),
    contacto_nombre VARCHAR(150),
    telefono VARCHAR(20),
    email VARCHAR(100)
);

-- ── TABLA: CLIENTES ──
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_comercial VARCHAR(150),
    contacto_principal VARCHAR(150),
    telefono VARCHAR(20),
    email VARCHAR(100),
    requiere_factura BOOLEAN DEFAULT FALSE,
    razon_social VARCHAR(150),
    rfc VARCHAR(13),
    direccion_fiscal TEXT,
    codigo_postal VARCHAR(10),
    regimen_fiscal VARCHAR(50)
);

-- ── TABLA: PRODUCTOS ──
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT,
    nombre VARCHAR(150),
    stock INT DEFAULT 0,
    precio DECIMAL(10,2) DEFAULT 0.00,
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

-- ── TABLA: VENTAS ──
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT,
    empleado_id INT,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    iva DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    tipo_comprobante VARCHAR(50) DEFAULT 'Ticket',
    folio_fiscal VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'Pagada',
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (empleado_id) REFERENCES empleados_usuarios(id) ON DELETE SET NULL
);

-- ── TABLA: DETALLE DE VENTAS ──
CREATE TABLE venta_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT,
    producto_id INT,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) DEFAULT 0.00,
    importe_linea DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- ── TABLA: COTIZACIONES ──
CREATE TABLE cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT,
    empleado_id INT,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    iva DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    vigencia_dias INT DEFAULT 15,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (empleado_id) REFERENCES empleados_usuarios(id) ON DELETE SET NULL
);

-- ── TABLA: DETALLE DE COTIZACIONES ──
CREATE TABLE cotizacion_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT,
    producto_id INT,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) DEFAULT 0.00,
    importe_linea DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL
);

-- ── USUARIO ADMIN POR DEFECTO ──
INSERT INTO empleados_usuarios (nombre_completo, usuario, password, rol, puesto, activo)
VALUES ('Administrador Sistema', 'admin', '1234', 'admin', 'Gerente', true);

SET FOREIGN_KEY_CHECKS = 1;
