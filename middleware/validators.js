/**
 * Middleware de Validaciones para ERP
 * Funciones reutilizables para sanitizar y validar datos de formularios
 */

// ─── Funciones de Sanitización ───────────────────────────────────────

/**
 * Limpia un string de caracteres HTML peligrosos para prevenir XSS
 */
function sanitize(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Limpia y recorta espacios de un string
 */
function trimSanitize(str) {
    if (str === null || str === undefined) return '';
    return sanitize(String(str).trim());
}

// ─── Funciones de Validación ─────────────────────────────────────────

function isNonEmpty(val) {
    if (val === null || val === undefined) return false;
    return String(val).trim().length > 0;
}

function isPositiveNumber(val) {
    const n = Number(val);
    return !isNaN(n) && isFinite(n) && n > 0;
}

function isNonNegativeNumber(val) {
    const n = Number(val);
    return !isNaN(n) && isFinite(n) && n >= 0;
}

function isPositiveInteger(val) {
    const n = Number(val);
    return !isNaN(n) && isFinite(n) && Number.isInteger(n) && n > 0;
}

function isNonNegativeInteger(val) {
    const n = Number(val);
    return !isNaN(n) && isFinite(n) && Number.isInteger(n) && n >= 0;
}

function isValidEmail(email) {
    if (!email || String(email).trim() === '') return true; // Opcional
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).trim());
}

function isRequiredEmail(email) {
    if (!email || String(email).trim() === '') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).trim());
}

function isValidPhone(phone) {
    if (!phone || String(phone).trim() === '') return true; // Opcional
    // Al menos 7 dígitos
    const digits = String(phone).replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
}

function isValidRFC(rfc) {
    if (!rfc || String(rfc).trim() === '') return true; // Opcional
    const re = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
    return re.test(String(rfc).trim());
}

function isValidCP(cp) {
    if (!cp || String(cp).trim() === '') return true; // Opcional
    return /^\d{5}$/.test(String(cp).trim());
}

function isValidId(val) {
    const n = Number(val);
    return !isNaN(n) && isFinite(n) && Number.isInteger(n) && n > 0;
}

// ─── Roles válidos del sistema ───────────────────────────────────────

const ROLES_VALIDOS = ['admin', 'Admin', 'SUPER ADMIN', 'RH', 'VENTAS', 'COMPRAS'];
const ESTADOS_FACTURA = ['Pendiente', 'Pagada', 'Vencida'];

// ─── Middleware Factory ──────────────────────────────────────────────

/**
 * Crea un middleware de validación basado en reglas
 * 
 * Uso:
 *   validateBody({
 *     nombre: { required: true, label: 'Nombre' },
 *     email:  { email: true, label: 'Correo' },
 *     stock:  { positiveInt: true, label: 'Stock' }
 *   })
 *
 * Reglas disponibles:
 *   required      - campo no vacío
 *   email         - formato email válido (requerido)
 *   optionalEmail - formato email si se proporciona
 *   phone         - formato teléfono si se proporciona
 *   rfc           - formato RFC si se proporciona
 *   cp            - código postal 5 dígitos si se proporciona
 *   positive      - número > 0
 *   nonNegative   - número >= 0
 *   positiveInt   - entero > 0
 *   nonNegativeInt- entero >= 0
 *   validId       - entero positivo (para IDs)
 *   minLength     - longitud mínima del string
 *   oneOf         - debe ser uno de los valores del array
 */
function validateBody(rules) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rule] of Object.entries(rules)) {
            const val = req.body[field];
            const label = rule.label || field;

            if (rule.required && !isNonEmpty(val)) {
                errors.push(`${label} es obligatorio`);
                continue; // No validar más si está vacío y es requerido
            }

            // Solo validar formato si el campo tiene valor
            if (val !== undefined && val !== null && String(val).trim() !== '') {
                if (rule.email && !isRequiredEmail(val)) {
                    errors.push(`${label} no tiene un formato de correo válido`);
                }
                if (rule.optionalEmail && !isValidEmail(val)) {
                    errors.push(`${label} no tiene un formato de correo válido`);
                }
                if (rule.phone && !isValidPhone(val)) {
                    errors.push(`${label} debe tener entre 7 y 15 dígitos`);
                }
                if (rule.rfc && !isValidRFC(val)) {
                    errors.push(`${label} no tiene formato RFC válido (ej: XAXX010101000)`);
                }
                if (rule.cp && !isValidCP(val)) {
                    errors.push(`${label} debe ser de 5 dígitos`);
                }
                if (rule.positive && !isPositiveNumber(val)) {
                    errors.push(`${label} debe ser un número mayor a 0`);
                }
                if (rule.nonNegative && !isNonNegativeNumber(val)) {
                    errors.push(`${label} debe ser un número mayor o igual a 0`);
                }
                if (rule.positiveInt && !isPositiveInteger(val)) {
                    errors.push(`${label} debe ser un número entero mayor a 0`);
                }
                if (rule.nonNegativeInt && !isNonNegativeInteger(val)) {
                    errors.push(`${label} debe ser un número entero positivo o cero`);
                }
                if (rule.validId && !isValidId(val)) {
                    errors.push(`${label} no es un identificador válido`);
                }
                if (rule.minLength && String(val).trim().length < rule.minLength) {
                    errors.push(`${label} debe tener al menos ${rule.minLength} caracteres`);
                }
                if (rule.oneOf && !rule.oneOf.includes(val)) {
                    errors.push(`${label} debe ser uno de: ${rule.oneOf.join(', ')}`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Errores de validación',
                errors: errors
            });
        }

        // Sanitizar todos los campos string del body
        for (const key of Object.keys(req.body)) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }

        next();
    };
}

/**
 * Valida que un parámetro de ruta sea un ID entero válido
 */
function validateParamId(paramName = 'id') {
    return (req, res, next) => {
        const val = req.params[paramName];
        if (!isValidId(val)) {
            return res.status(400).json({
                success: false,
                message: `Parámetro '${paramName}' no es un ID válido`
            });
        }
        next();
    };
}

/**
 * Valida que un query param sea un ID entero válido
 */
function validateQueryId(queryName = 'id') {
    return (req, res, next) => {
        const val = req.query[queryName];
        if (!isValidId(val)) {
            return res.redirect('back');
        }
        next();
    };
}

module.exports = {
    sanitize,
    trimSanitize,
    isNonEmpty,
    isPositiveNumber,
    isNonNegativeNumber,
    isPositiveInteger,
    isNonNegativeInteger,
    isValidEmail,
    isRequiredEmail,
    isValidPhone,
    isValidRFC,
    isValidCP,
    isValidId,
    ROLES_VALIDOS,
    ESTADOS_FACTURA,
    validateBody,
    validateParamId,
    validateQueryId
};
