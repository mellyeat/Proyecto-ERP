--datos semilla sumulados para que la app se vea atractiva visualmente--
INSERT INTO empleados_usuarios (nombre_completo, usuario, password, rol, puesto, salario, activo) VALUES
('María García López', 'mgarcia', 'pass123', 'VENTAS', 'Ejecutiva de Ventas', 18500.00, true),
('Carlos Rodríguez Martínez', 'crodriguez', 'pass123', 'COMPRAS', 'Jefe de Compras', 22000.00, true),
('Ana Sofía Hernández', 'ahernandez', 'pass123', 'RH', 'Coordinadora de RH', 20000.00, true),
('Roberto Díaz Flores', 'rdiaz', 'pass123', 'VENTAS', 'Vendedor', 15000.00, true),
('Laura Mendoza Sánchez', 'lmendoza', 'pass123', 'COMPRAS', 'Auxiliar de Almacén', 12500.00, true),
('Fernando Torres Ruiz', 'ftorres', 'pass123', 'VENTAS', 'Asesor Comercial', 16000.00, false);

INSERT INTO proveedores (razon_social, rfc, categoria, contacto_nombre, telefono, email) VALUES
('TechDistributor S.A. de C.V.', 'TDI980512AB3', 'electronica', 'Ing. Pedro Castillo', '(55) 5512-3456', 'ventas@techdist.mx'),
('Periféricos Globales', 'PGL030821MN7', 'perifericos', 'Lic. Mariana Ríos', '(33) 3345-6789', 'contacto@perifglobal.com'),
('SoftWare México S.A.', 'SWM110305QR1', 'software', 'Ing. David Núñez', '(55) 5598-1122', 'david@softwaremx.com'),
('Muebles Ejecutivos del Norte', 'MEN950714TU9', 'oficina', 'Sr. Raúl Vega', '(81) 8834-5678', 'raul@mueblesej.mx'),
('Conectividad Total', 'COT180620XY5', 'electronica', 'Dra. Paola Guzmán', '(55) 5567-8901', 'paola@contotal.com');

INSERT INTO clientes (nombre_comercial, contacto_principal, telefono, email, requiere_factura, razon_social, rfc, direccion_fiscal, codigo_postal, regimen_fiscal) VALUES
('Corporativo Azteca S.A.', 'Lic. Jorge Ramírez', '(55) 5523-4567', 'jorge@corpazteca.mx', 1, 'Corporativo Azteca S.A. de C.V.', 'CAZ980315AB1', 'Av. Reforma 350 Piso 12, Col. Juárez, CDMX', '06600', '601'),
('Restaurantes Don Miguel', 'Chef Miguel Ángel Ortiz', '(33) 3312-8899', 'miguel@donmiguel.com', 1, 'Alimentos Don Miguel S.A.', 'ADM050721QW3', 'Blvd. Vallarta 2450, Guadalajara, Jal.', '44130', '612'),
('Escuela TecnoSaber', 'Mtra. Claudia Ríos', '(222) 246-3300', 'claudia@tecnosaber.edu', 0, NULL, NULL, NULL, NULL, NULL),
('Consultores Estratégicos MX', 'MBA Andrés Salinas', '(55) 5534-7766', 'asalinas@consulmx.com', 1, 'Consultores Estratégicos MX S.C.', 'CEM120918PL6', 'Calle Monte Líbano 245, Lomas, CDMX', '11000', '626'),
('Farmacia Salud Plus', 'QFB Patricia Loera', '(81) 8845-2200', 'patricia@saludplus.mx', 1, 'Farmacia Salud Plus S.A. de C.V.', 'FSP970305MK2', 'Av. Constitución 1890, Monterrey, NL', '64000', '601'),
('Gimnasio Iron Fitness', 'Coach Ricardo Vargas', '(55) 5578-4400', 'rvargas@ironfitness.mx', 0, NULL, NULL, NULL, NULL, NULL),
('Hotel Paraíso Costero', 'Gerente Luis Mora', '(998) 888-3300', 'lmora@paraisocostero.com', 1, 'Operadora Paraíso Costero S.A.', 'OPC081115RT8', 'Blvd. Kukulcán Km 14.5, Cancún, QR', '77500', '601'),
('Imprenta Digital Express', 'Diseñador Kevin Reyes', '(442) 215-6600', 'kreyes@impdigital.mx', 1, 'Imprenta Digital Express S.A.', 'IDE140507AB0', 'Av. Universidad 380, Querétaro, Qro.', '76010', '612');

INSERT INTO productos (nombre, proveedor_id, stock, precio) VALUES
('Laptop Dell Inspiron 15', 1, 5, 18999.00),
('Monitor Samsung 27" 144Hz', 1, 8, 6499.00),
('Teclado Mecánico Redragon Kumara', 2, 45, 1299.00),
('Mouse Logitech MX Master 3', 2, 32, 1899.00),
('Audífonos Sony WH-1000XM5', 1, 3, 7499.00),
('Webcam Logitech C920 HD', 2, 22, 1599.00),
('Impresora HP LaserJet Pro', 5, 7, 5299.00),
('Disco SSD Samsung 1TB', 1, 60, 2199.00),
('Silla Ejecutiva Ergonómica', 4, 12, 4599.00),
('Escritorio Ajustable Standing', 4, 4, 8999.00),
('Cable HDMI 2.1 3m', 5, 150, 349.00),
('Hub USB-C 7 en 1', 5, 28, 899.00),
('Licencia Office 365 Anual', 3, 200, 1999.00),
('Licencia Windows 11 Pro', 3, 180, 3499.00),
('Memoria RAM DDR5 16GB', 1, 2, 1899.00),
('Tablet Samsung Galaxy Tab A9', 1, 9, 4299.00),
('UPS CyberPower 1500VA', 5, 6, 3799.00),
('Router TP-Link WiFi 6', 5, 35, 1499.00);


INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(1, 2, 18999.00, 3039.84, 22038.84, DATE_SUB(NOW(), INTERVAL 10 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 1, 1, 18999.00, 18999.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(2, 2, 12998.00, 2079.68, 15077.68, DATE_SUB(NOW(), INTERVAL 9 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 2, 2, 6499.00, 12998.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(3, 5, 5196.00, 831.36, 6027.36, DATE_SUB(NOW(), INTERVAL 7 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 3, 4, 1299.00, 5196.00);
INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(4, 2, 7499.00, 1199.84, 8698.84, DATE_SUB(NOW(), INTERVAL 6 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 5, 1, 7499.00, 7499.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(5, 5, 9198.00, 1471.68, 10669.68, DATE_SUB(NOW(), INTERVAL 5 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 9, 2, 4599.00, 9198.00);
INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(1, 2, 15996.00, 2559.36, 18555.36, DATE_SUB(NOW(), INTERVAL 4 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 14, 2, 3499.00, 6998.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(7, 5, 8999.00, 1439.84, 10438.84, DATE_SUB(NOW(), INTERVAL 3 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 10, 1, 8999.00, 8999.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(6, 2, 3198.00, 511.68, 3709.68, DATE_SUB(NOW(), INTERVAL 2 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 6, 2, 1599.00, 3198.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(8, 5, 5997.00, 959.52, 6956.52, DATE_SUB(NOW(), INTERVAL 1 DAY));
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 13, 3, 1999.00, 5997.00);
INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(4, 2, 3798.00, 607.68, 4405.68, NOW());
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 4, 2, 1899.00, 3798.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(2, 5, 13997.00, 2239.52, 16236.52, NOW());
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 8, 3, 2199.00, 6597.00);

INSERT INTO ventas (cliente_id, empleado_id, subtotal, iva, total, fecha_emision) VALUES
(5, 2, 7598.00, 1215.68, 8813.68, NOW());
INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, importe_linea) VALUES
(LAST_INSERT_ID(), 17, 2, 3799.00, 7598.00);
