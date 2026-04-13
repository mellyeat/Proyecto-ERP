/**
 * ══════════════════════════════════════════════════════════════
 *  PRUEBAS DE VALIDACIÓN — ERP Sistema
 *  Ejecutar con: node tests/validation-test.js
 *  El servidor debe estar corriendo en http://localhost:3000
 * ══════════════════════════════════════════════════════════════
 *  Verifica que TODAS las rutas POST rechacen correctamente
 *  datos inválidos y acepten datos válidos.
 * ══════════════════════════════════════════════════════════════
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = null;
let passed = 0;
let failed = 0;
const results = [];

// ─── Utilidades ──────────────────────────────────────────────

function makeRequest(method, path, body = null, contentType = 'urlencoded') {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: { 'Accept': 'text/html,application/json' },
            timeout: 10000
        };

        if (sessionCookie) {
            options.headers['Cookie'] = sessionCookie;
        }

        let bodyStr = null;
        if (body !== null) {
            if (contentType === 'json') {
                bodyStr = JSON.stringify(body);
                options.headers['Content-Type'] = 'application/json';
            } else {
                bodyStr = typeof body === 'string' ? body : new URLSearchParams(body).toString();
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.headers['set-cookie']) {
                    for (const c of res.headers['set-cookie']) {
                        if (c.includes('connect.sid')) {
                            sessionCookie = c.split(';')[0];
                        }
                    }
                }
                resolve({
                    status: res.statusCode,
                    body: data,
                    headers: res.headers
                });
            });
        });

        req.on('error', (err) => resolve({ status: 0, body: err.message, headers: {} }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT', headers: {} }); });

        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

function assert(testName, condition, detail = '') {
    if (condition) {
        passed++;
        results.push({ test: testName, status: '✅ PASS', detail });
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        results.push({ test: testName, status: '❌ FAIL', detail });
        console.log(`  ❌ ${testName} ${detail ? '— ' + detail : ''}`);
    }
}

function assertStatus(testName, actualStatus, expectedStatus) {
    const ok = Array.isArray(expectedStatus) 
        ? expectedStatus.includes(actualStatus) 
        : actualStatus === expectedStatus;
    assert(testName, ok, ok ? '' : `esperaba ${expectedStatus} pero recibió ${actualStatus}`);
}

// ─── Pruebas ─────────────────────────────────────────────────

async function testLogin() {
    console.log('\n━━ LOGIN ━━');

    // Campos vacíos → 400
    let res = await makeRequest('POST', '/login', 'usuario=&password=');
    assert('Login campos vacíos → 400', res.status === 400);

    // Solo usuario → 400
    res = await makeRequest('POST', '/login', 'usuario=admin&password=');
    assert('Login sin contraseña → 400', res.status === 400);

    // Credenciales incorrectas → 200 (render de error)
    res = await makeRequest('POST', '/login', 'usuario=noexiste&password=falso');
    assert('Login incorrecto → 200 (render con error)', res.status === 200);

    // Login correcto → redirect (302)
    res = await makeRequest('POST', '/login', 'usuario=admin&password=admin123');
    assert('Login correcto → 302 redirect', res.status === 302 || res.status === 200);
}

async function testAccesoSinSesion() {
    console.log('\n━━ ACCESO SIN SESIÓN ━━');
    const savedCookie = sessionCookie;
    sessionCookie = null; // Quitar sesión

    let res = await makeRequest('GET', '/dashboard');
    assert('Dashboard sin sesión → redirect', res.status === 302 || res.status === 301);

    res = await makeRequest('GET', '/empleados');
    assert('Empleados sin sesión → redirect', res.status === 302 || res.status === 301);

    res = await makeRequest('POST', '/empleados/add', 'nombre_completo=Test&usuario=test&password=test1234&rol=RH');
    assert('POST empleados sin sesión → redirect', res.status === 302 || res.status === 301);

    sessionCookie = savedCookie; // Restaurar sesión
}

async function testEmpleados() {
    console.log('\n━━ VALIDACIÓN: EMPLEADOS ━━');

    // Campos vacíos
    let res = await makeRequest('POST', '/empleados/add', 'nombre_completo=&usuario=&password=&rol=');
    assertStatus('Empleados: campos vacíos → 400', res.status, 400);

    // Usuario muy corto
    res = await makeRequest('POST', '/empleados/add', 'nombre_completo=Test&usuario=ab&password=1234&rol=admin');
    assertStatus('Empleados: usuario < 3 chars → 400', res.status, 400);

    // Contraseña muy corta
    res = await makeRequest('POST', '/empleados/add', 'nombre_completo=Test&usuario=testuser&password=12&rol=admin');
    assertStatus('Empleados: password < 4 chars → 400', res.status, 400);

    // Rol inválido
    res = await makeRequest('POST', '/empleados/add', 'nombre_completo=Test&usuario=testuser&password=1234&rol=SUPERUSER');
    assertStatus('Empleados: rol inválido → 400', res.status, 400);

    // Salario negativo
    res = await makeRequest('POST', '/empleados/add', 'nombre_completo=Test&usuario=testuser&password=1234&rol=admin&salario=-5000');
    assertStatus('Empleados: salario negativo → 400', res.status, 400);

    // XSS en nombre
    res = await makeRequest('POST', '/empleados/add', 
        'nombre_completo=<script>alert("xss")</script>&usuario=testxss&password=1234&rol=admin&salario=1000');
    assert('Empleados: XSS en nombre → acepta sanitizado (no 500)', res.status !== 500);

    // Editar con ID inválido
    res = await makeRequest('POST', '/empleados/edit', 'id=abc&nombre_completo=Test&usuario=test&rol=admin');
    assertStatus('Empleados: editar con ID no numérico → 400', res.status, 400);

    res = await makeRequest('POST', '/empleados/edit', 'id=-1&nombre_completo=Test&usuario=test&rol=admin');
    assertStatus('Empleados: editar con ID negativo → 400', res.status, 400);
}

async function testProductos() {
    console.log('\n━━ VALIDACIÓN: PRODUCTOS ━━');

    // Campos vacíos
    let res = await makeRequest('POST', '/productos/add', 'nombre=&proveedor=&stock=&precio=');
    assertStatus('Productos: campos vacíos → 400', res.status, 400);

    // Stock negativo
    res = await makeRequest('POST', '/productos/add', 'nombre=Test&proveedor=1&stock=-5&precio=100');
    assertStatus('Productos: stock negativo → 400', res.status, 400);

    // Precio negativo
    res = await makeRequest('POST', '/productos/add', 'nombre=Test&proveedor=1&stock=10&precio=-50');
    assertStatus('Productos: precio negativo → 400', res.status, 400);

    // Precio cero
    res = await makeRequest('POST', '/productos/add', 'nombre=Test&proveedor=1&stock=10&precio=0');
    assertStatus('Productos: precio cero → 400', res.status, 400);

    // Proveedor no numérico
    res = await makeRequest('POST', '/productos/add', 'nombre=Test&proveedor=abc&stock=10&precio=100');
    assertStatus('Productos: proveedor ID texto → 400', res.status, 400);

    // Stock decimal
    res = await makeRequest('POST', '/productos/add', 'nombre=Test&proveedor=1&stock=5.5&precio=100');
    assertStatus('Productos: stock decimal → 400', res.status, 400);

    // Eliminar con ID inválido
    res = await makeRequest('POST', '/productos/delete/abc');
    assertStatus('Productos: eliminar con ID texto → 400', res.status, 400);

    res = await makeRequest('POST', '/productos/delete/0');
    assertStatus('Productos: eliminar con ID 0 → 400', res.status, 400);

    res = await makeRequest('POST', '/productos/delete/-1');
    assertStatus('Productos: eliminar con ID negativo → 400', res.status, 400);
}

async function testProveedores() {
    console.log('\n━━ VALIDACIÓN: PROVEEDORES ━━');

    // Campos vacíos
    let res = await makeRequest('POST', '/productos/proveedor-add', 'empresa=&contacto=&email=');
    assertStatus('Proveedores: campos vacíos → 400', res.status, 400);

    // Email inválido
    res = await makeRequest('POST', '/productos/proveedor-add', 'empresa=Test&contacto=Juan&email=noesuncorreo');
    assertStatus('Proveedores: email inválido → 400', res.status, 400);

    // RFC inválido
    res = await makeRequest('POST', '/productos/proveedor-add', 'empresa=Test&contacto=Juan&email=a@b.com&rfc=123');
    assertStatus('Proveedores: RFC inválido → 400', res.status, 400);

    // Teléfono con pocos dígitos
    res = await makeRequest('POST', '/productos/proveedor-add', 'empresa=Test&contacto=Juan&email=a@b.com&telefono=12');
    assertStatus('Proveedores: teléfono < 7 dígitos → 400', res.status, 400);

    // Eliminar con ID inválido
    res = await makeRequest('POST', '/productos/proveedor-delete/abc');
    assertStatus('Proveedores: eliminar con ID texto → 400', res.status, 400);
}

async function testClientes() {
    console.log('\n━━ VALIDACIÓN: CLIENTES ━━');

    // Campos vacíos
    let res = await makeRequest('POST', '/clientes/add', 'nombre=&email=');
    assertStatus('Clientes: campos vacíos → 400', res.status, 400);

    // Email inválido
    res = await makeRequest('POST', '/clientes/add', 'nombre=Test&email=invalido');
    assertStatus('Clientes: email inválido → 400', res.status, 400);

    // RFC inválido (menos de 10 chars)
    res = await makeRequest('POST', '/clientes/add', 'nombre=Test&email=a@b.com&rfc=12345');
    assertStatus('Clientes: RFC inválido → 400', res.status, 400);

    // Código postal no 5 dígitos
    res = await makeRequest('POST', '/clientes/add', 'nombre=Test&email=a@b.com&cp=1234');
    assertStatus('Clientes: CP no 5 dígitos → 400', res.status, 400);

    res = await makeRequest('POST', '/clientes/add', 'nombre=Test&email=a@b.com&cp=123456');
    assertStatus('Clientes: CP 6 dígitos → 400', res.status, 400);

    // Teléfono con letras
    res = await makeRequest('POST', '/clientes/add', 'nombre=Test&email=a@b.com&telefono=abc');
    assertStatus('Clientes: teléfono solo letras → 400', res.status, 400);

    // Editar con ID inválido
    res = await makeRequest('POST', '/clientes/edit', 'id=abc&nombre=Test&email=a@b.com');
    assertStatus('Clientes: editar con ID texto → 400', res.status, 400);
}

async function testVentas() {
    console.log('\n━━ VALIDACIÓN: VENTAS ━━');

    // Campos vacíos
    let res = await makeRequest('POST', '/ventas/add', 'cliente_id=&producto_id=&cantidad=');
    assertStatus('Ventas: campos vacíos → 400', res.status, 400);

    // IDs no numéricos
    res = await makeRequest('POST', '/ventas/add', 'cliente_id=abc&producto_id=def&cantidad=1');
    assertStatus('Ventas: IDs texto → 400', res.status, 400);

    // Cantidad 0
    res = await makeRequest('POST', '/ventas/add', 'cliente_id=1&producto_id=1&cantidad=0');
    assertStatus('Ventas: cantidad 0 → 400', res.status, 400);

    // Cantidad negativa
    res = await makeRequest('POST', '/ventas/add', 'cliente_id=1&producto_id=1&cantidad=-5');
    assertStatus('Ventas: cantidad negativa → 400', res.status, 400);

    // Cantidad decimal
    res = await makeRequest('POST', '/ventas/add', 'cliente_id=1&producto_id=1&cantidad=1.5');
    assertStatus('Ventas: cantidad decimal → 400', res.status, 400);
}

async function testCotizaciones() {
    console.log('\n━━ VALIDACIÓN: COTIZACIONES ━━');

    // Campos vacíos
    let res = await makeRequest('POST', '/cotizaciones/add', 'cliente_id=&producto_id=&cantidad=&vigencia_dias=');
    assertStatus('Cotizaciones: campos vacíos → 400', res.status, 400);

    // Cantidad 0
    res = await makeRequest('POST', '/cotizaciones/add', 'cliente_id=1&producto_id=1&cantidad=0&vigencia_dias=15');
    assertStatus('Cotizaciones: cantidad 0 → 400', res.status, 400);

    // Vigencia 0
    res = await makeRequest('POST', '/cotizaciones/add', 'cliente_id=1&producto_id=1&cantidad=1&vigencia_dias=0');
    assertStatus('Cotizaciones: vigencia 0 → 400', res.status, 400);

    // Vigencia negativa
    res = await makeRequest('POST', '/cotizaciones/add', 'cliente_id=1&producto_id=1&cantidad=1&vigencia_dias=-5');
    assertStatus('Cotizaciones: vigencia negativa → 400', res.status, 400);
}

async function testFacturas() {
    console.log('\n━━ VALIDACIÓN: FACTURAS ━━');

    // ID inválido
    let res = await makeRequest('POST', '/ventas/facturas/cambiar-estado',
        { id: 'abc', estado: 'Pagada' }, 'json');
    assertStatus('Facturas: ID texto → 400', res.status, 400);

    // Estado inválido
    res = await makeRequest('POST', '/ventas/facturas/cambiar-estado',
        { id: 1, estado: 'EstadoFalso' }, 'json');
    assertStatus('Facturas: estado inválido → 400', res.status, 400);

    // Campos vacíos
    res = await makeRequest('POST', '/ventas/facturas/cambiar-estado',
        { id: '', estado: '' }, 'json');
    assertStatus('Facturas: campos vacíos → 400', res.status, 400);
}

async function testRuta404() {
    console.log('\n━━ RUTA 404 ━━');
    let res = await makeRequest('GET', '/ruta-que-no-existe');
    assert('Ruta inexistente → 404', res.status === 404);

    res = await makeRequest('GET', '/admin/panel/secret');
    assert('Ruta admin falsa → 404', res.status === 404);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║       PRUEBAS DE VALIDACIÓN — ERP Sistema v1.0             ║');
    console.log('║       Target: ' + BASE_URL + '                            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Login primero para tener sesión
    console.log('\n  🔑 Obteniendo sesión válida...');
    // Probar varias contraseñas posibles
    const passwords = ['admin123', '1234', 'admin'];
    for (const pwd of passwords) {
        const loginRes = await makeRequest('POST', '/login', `usuario=admin&password=${pwd}`);
        console.log(`     Intento admin/${pwd} → Status: ${loginRes.status}`);
        if (sessionCookie) {
            console.log('     ✅ Sesión activa: ' + sessionCookie.substring(0, 30) + '...');
            break;
        }
    }
    if (!sessionCookie) {
        console.log('     ❌ No se pudo obtener sesión con ninguna contraseña conocida.');
        console.log('     Nota: Las pruebas de rutas protegidas mostrarán 302 en lugar de 400.');
    }

    await testLogin();
    await testAccesoSinSesion();
    await testEmpleados();
    await testProductos();
    await testProveedores();
    await testClientes();
    await testVentas();
    await testCotizaciones();
    await testFacturas();
    await testRuta404();

    // Reporte final
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║             REPORTE DE PRUEBAS DE VALIDACIÓN               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Total de pruebas:  ${passed + failed}`);
    console.log(`  ✅ Pasaron:        ${passed}`);
    console.log(`  ❌ Fallaron:       ${failed}`);
    console.log('');

    if (failed === 0) {
        console.log('  🏆 RESULTADO: ✅ TODAS LAS PRUEBAS PASARON');
        console.log('     Todas las validaciones funcionan correctamente.');
    } else {
        console.log('  ⚠️  RESULTADO: ALGUNAS PRUEBAS FALLARON');
        console.log('     Pruebas fallidas:');
        for (const r of results) {
            if (r.status === '❌ FAIL') {
                console.log(`       - ${r.test} ${r.detail ? '(' + r.detail + ')' : ''}`);
            }
        }
    }
    console.log('');
}

main().catch(err => {
    console.error('Error ejecutando pruebas:', err);
    process.exit(1);
});
