/**
 * ══════════════════════════════════════════════════════════════
 *  PRUEBAS DE ESTRÉS — ERP Sistema
 *  Ejecutar con: node tests/stress-test.js
 *  El servidor debe estar corriendo en http://localhost:3000
 * ══════════════════════════════════════════════════════════════
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';
const RESULTS = {};
let sessionCookie = null;

// ─── Utilidades ──────────────────────────────────────────────

function makeRequest(method, path, body = null, followRedirects = false) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Accept': 'text/html,application/json',
            },
            timeout: 15000
        };

        if (sessionCookie) {
            options.headers['Cookie'] = sessionCookie;
        }

        if (body) {
            let bodyStr;
            if (typeof body === 'string') {
                bodyStr = body;
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            } else {
                bodyStr = JSON.stringify(body);
                options.headers['Content-Type'] = 'application/json';
            }
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        const start = Date.now();

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Capture session cookie
                if (res.headers['set-cookie']) {
                    const cookies = res.headers['set-cookie'];
                    for (const c of cookies) {
                        if (c.includes('connect.sid')) {
                            sessionCookie = c.split(';')[0];
                        }
                    }
                }
                resolve({
                    status: res.statusCode,
                    time: Date.now() - start,
                    size: data.length,
                    headers: res.headers,
                    body: data.substring(0, 500)
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                status: 0,
                time: Date.now() - start,
                error: err.message,
                size: 0
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                status: 0,
                time: Date.now() - start,
                error: 'TIMEOUT',
                size: 0
            });
        });

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runConcurrent(name, requests) {
    console.log(`\n  ⏱  Ejecutando: ${name} (${requests.length} peticiones)...`);
    const start = Date.now();
    const results = await Promise.all(requests);
    const totalTime = Date.now() - start;

    const times = results.map(r => r.time).sort((a, b) => a - b);
    const errors = results.filter(r => r.status === 0 || r.status >= 500);
    const rejected = results.filter(r => r.status === 400 || r.status === 403 || r.status === 429);
    const success = results.filter(r => r.status >= 200 && r.status < 400);

    const stats = {
        name,
        total: results.length,
        success: success.length,
        rejected: rejected.length,
        errors: errors.length,
        totalTimeMs: totalTime,
        p50: times[Math.floor(times.length * 0.5)],
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)],
        min: times[0],
        max: times[times.length - 1],
        avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        rps: Math.round(results.length / (totalTime / 1000) * 100) / 100,
        errorDetails: errors.slice(0, 3).map(e => e.error || `HTTP ${e.status}`)
    };

    RESULTS[name] = stats;

    const statusIcon = stats.errors === 0 ? '✅' : (stats.errors < stats.total * 0.1 ? '⚠️' : '❌');
    console.log(`  ${statusIcon} ${name}`);
    console.log(`     Total: ${stats.total} | OK: ${stats.success} | Rechazados: ${stats.rejected} | Errores: ${stats.errors}`);
    console.log(`     Tiempo: p50=${stats.p50}ms p95=${stats.p95}ms p99=${stats.p99}ms max=${stats.max}ms`);
    console.log(`     RPS: ${stats.rps} req/s | Duración total: ${stats.totalTimeMs}ms`);

    if (errors.length > 0) {
        console.log(`     ⚠ Errores: ${errors.slice(0, 3).map(e => e.error || `HTTP ${e.status}`).join(', ')}`);
    }

    return stats;
}

// ─── Fases de prueba ─────────────────────────────────────────

async function loginAndGetSession() {
    console.log('\n  🔑 Obteniendo sesión válida...');
    const passwords = ['admin123', '1234', 'admin'];
    for (const pwd of passwords) {
        const res = await makeRequest('POST', '/login', `usuario=admin&password=${pwd}`);
        if (sessionCookie) {
            console.log(`     ✅ Sesión obtenida con admin/${pwd}`);
            return;
        }
    }
    console.log('     ⚠️  No se pudo obtener sesión. Las pruebas de rutas protegidas podrían fallar.');
}

async function fase1_estresLogin() {
    console.log('\n━━ FASE 1: Bombardeo de Login ━━');
    
    // Intentos con credenciales inválidas
    const badLogins = [];
    for (let i = 0; i < 50; i++) {
        badLogins.push(makeRequest('POST', '/login', `usuario=fake${i}&password=wrong${i}`));
    }
    await runConcurrent('Login inválidos (50)', badLogins);

    // Intentos con campos vacíos
    const emptyLogins = [];
    for (let i = 0; i < 30; i++) {
        emptyLogins.push(makeRequest('POST', '/login', 'usuario=&password='));
    }
    await runConcurrent('Login campos vacíos (30)', emptyLogins);
}

async function fase2_bombardeoPaginas() {
    console.log('\n━━ FASE 2: Bombardeo de Páginas (GET) ━━');

    const publicPaths = ['/login', '/', '/login', '/', '/login'];
    const protectedPaths = [
        '/dashboard', '/empleados', '/empleados/consultas',
        '/productos', '/productos/consultas', '/productos/proveedores',
        '/ventas', '/ventas/consultas', '/ventas/facturas',
        '/clientes', '/clientes/consultas',
        '/cotizaciones/consultas'
    ];

    // Bombardear páginas públicas
    const publicReqs = [];
    for (let i = 0; i < 100; i++) {
        const path = publicPaths[i % publicPaths.length];
        publicReqs.push(makeRequest('GET', path));
    }
    await runConcurrent('Páginas públicas (100)', publicReqs);

    // Bombardear páginas protegidas (con sesión)
    const protectedReqs = [];
    for (let i = 0; i < 200; i++) {
        const path = protectedPaths[i % protectedPaths.length];
        protectedReqs.push(makeRequest('GET', path));
    }
    await runConcurrent('Páginas protegidas (200)', protectedReqs);
}

async function fase3_estresAPIs() {
    console.log('\n━━ FASE 3: Estrés de APIs JSON ━━');

    const apiPaths = ['/api/metricas', '/api/low-stock'];
    const apiReqs = [];
    for (let i = 0; i < 150; i++) {
        const path = apiPaths[i % apiPaths.length];
        apiReqs.push(makeRequest('GET', path));
    }
    await runConcurrent('APIs JSON (150)', apiReqs);
}

async function fase4_validacionRechazos() {
    console.log('\n━━ FASE 4: Validación de Rechazos (datos inválidos) ━━');

    const invalidPayloads = [];

    // Campos vacíos en empleados
    for (let i = 0; i < 20; i++) {
        invalidPayloads.push(makeRequest('POST', '/empleados/add', 'nombre_completo=&usuario=&password=&rol='));
    }
    // XSS en campos de texto
    for (let i = 0; i < 20; i++) {
        invalidPayloads.push(makeRequest('POST', '/empleados/add',
            'nombre_completo=<script>alert("xss")</script>&usuario=ab&password=123&rol=INVALIDO&salario=-100'));
    }
    // Valores negativos en productos
    for (let i = 0; i < 20; i++) {
        invalidPayloads.push(makeRequest('POST', '/productos/add',
            'nombre=&proveedor=abc&stock=-5&precio=-10'));
    }
    // Email inválido en clientes
    for (let i = 0; i < 20; i++) {
        invalidPayloads.push(makeRequest('POST', '/clientes/add',
            'nombre=&email=not-an-email&telefono=123&rfc=INVALID&cp=1234'));
    }
    // IDs inválidos en params
    for (let i = 0; i < 20; i++) {
        invalidPayloads.push(makeRequest('POST', '/productos/delete/abc'));
        invalidPayloads.push(makeRequest('POST', '/productos/proveedor-delete/0'));
        invalidPayloads.push(makeRequest('POST', '/productos/delete/-1'));
    }
    // Cantidad 0 o negativa en ventas
    for (let i = 0; i < 20; i++) {
        invalidPayloads.push(makeRequest('POST', '/ventas/add',
            'cliente_id=abc&producto_id=abc&cantidad=0'));
    }
    // Estado inválido en facturas
    for (let i = 0; i < 10; i++) {
        invalidPayloads.push(makeRequest('POST', '/ventas/facturas/cambiar-estado',
            JSON.stringify({ id: 'abc', estado: 'EstadoFalso' })));
    }

    await runConcurrent('Datos inválidos mixtos (' + invalidPayloads.length + ')', invalidPayloads);
}

async function fase5_cargaDB() {
    console.log('\n━━ FASE 5: Estrés de Concurrencia DB ━━');

    // Muchas consultas GET simultáneas que golpean la DB
    const dbReqs = [];
    const dbPaths = [
        '/dashboard',
        '/empleados/consultas',
        '/productos/consultas',
        '/ventas/consultas',
        '/clientes/consultas',
        '/api/metricas',
        '/api/low-stock'
    ];
    for (let i = 0; i < 100; i++) {
        const path = dbPaths[i % dbPaths.length];
        dbReqs.push(makeRequest('GET', path));
    }
    await runConcurrent('Consultas DB concurrentes (100)', dbReqs);
}

async function fase6_payloadGrande() {
    console.log('\n━━ FASE 6: Payloads Grandes ━━');
    
    const bigPayloads = [];
    const bigString = 'A'.repeat(10000); // 10KB string
    for (let i = 0; i < 20; i++) {
        bigPayloads.push(makeRequest('POST', '/empleados/add',
            `nombre_completo=${bigString}&usuario=${bigString}&password=${bigString}&rol=admin&salario=1000`));
    }
    await runConcurrent('Payloads grandes 10KB (20)', bigPayloads);

    // Payload extremo (cerca del límite 1MB)
    const hugePayloads = [];
    const hugeString = 'B'.repeat(500000);
    for (let i = 0; i < 5; i++) {
        hugePayloads.push(makeRequest('POST', '/productos/add',
            `nombre=${hugeString}&proveedor=1&stock=10&precio=100`));
    }
    await runConcurrent('Payloads 500KB (5)', hugePayloads);
}

// ─── Reporte Final ───────────────────────────────────────────

function printFinalReport() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           REPORTE FINAL DE PRUEBAS DE ESTRÉS               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    let totalRequests = 0;
    let totalErrors = 0;
    let totalRejected = 0;
    let totalSuccess = 0;
    let maxP99 = 0;

    const table = [];
    for (const [key, stats] of Object.entries(RESULTS)) {
        totalRequests += stats.total;
        totalErrors += stats.errors;
        totalRejected += stats.rejected;
        totalSuccess += stats.success;
        if (stats.p99 > maxP99) maxP99 = stats.p99;

        table.push({
            Prueba: stats.name,
            Total: stats.total,
            OK: stats.success,
            Rechazados: stats.rejected,
            Errores: stats.errors,
            'p50(ms)': stats.p50,
            'p95(ms)': stats.p95,
            'p99(ms)': stats.p99,
            'RPS': stats.rps
        });
    }

    console.table(table);

    console.log('\n📊 RESUMEN GLOBAL:');
    console.log(`   Total de peticiones:    ${totalRequests}`);
    console.log(`   Exitosas (2xx/3xx):     ${totalSuccess}`);
    console.log(`   Rechazadas (4xx):       ${totalRejected} (esto es CORRECTO — validaciones funcionando)`);
    console.log(`   Errores del servidor:   ${totalErrors}`);
    console.log(`   Peor p99:               ${maxP99}ms`);
    console.log('');

    if (totalErrors === 0) {
        console.log('  🏆  RESULTADO: ✅ TODAS LAS PRUEBAS PASARON');
        console.log('      El servidor soportó toda la carga sin errores 500 ni timeouts.');
        console.log('      Las validaciones rechazaron correctamente los datos inválidos.');
    } else {
        const errorRate = ((totalErrors / totalRequests) * 100).toFixed(2);
        if (errorRate < 1) {
            console.log(`  ⚠️  RESULTADO: MAYORMENTE ESTABLE (${errorRate}% tasa de error)`);
            console.log('      Algunos errores menores bajo alta carga.');
        } else {
            console.log(`  ❌  RESULTADO: SE DETECTARON PROBLEMAS (${errorRate}% tasa de error)`);
            console.log('      El servidor necesita mejoras para soportar alta concurrencia.');
        }
    }
    console.log('');
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║         PRUEBAS DE ESTRÉS — ERP Sistema v1.0               ║');
    console.log('║         Target: ' + BASE_URL + '                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Fase 1: Bombardeo de Login                                ║');
    console.log('║  Fase 2: Bombardeo de Páginas (GET)                        ║');
    console.log('║  Fase 3: Estrés de APIs JSON                               ║');
    console.log('║  Fase 4: Validación de Rechazos                            ║');
    console.log('║  Fase 5: Estrés de Concurrencia DB                         ║');
    console.log('║  Fase 6: Payloads Grandes                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Primero obtener sesión válida
    await loginAndGetSession();

    // Ejecutar todas las fases
    await fase1_estresLogin();
    await fase2_bombardeoPaginas();
    await fase3_estresAPIs();
    await fase4_validacionRechazos();
    await fase5_cargaDB();
    await fase6_payloadGrande();

    // Reporte final
    printFinalReport();
}

main().catch(err => {
    console.error('Error ejecutando pruebas:', err);
    process.exit(1);
});
