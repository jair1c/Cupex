const { createHash } = require('node:crypto');
const CAMPOS = ['diario', 'historial', 'estadoSesion', 'estadoSemana', 'ultimaLectura', 'limiteDiario', 'umbralAviso', 'limitesPorDia'];
function identidadCuenta(cuenta) {
  const correo = typeof cuenta?.email === 'string' ? cuenta.email.trim().toLowerCase() : '';
  return correo ? createHash('sha256').update(correo).digest('hex') : null;
}
function vincularPerfil(cuenta, identidad) {
  if (!identidad) throw new Error('No se puede identificar la cuenta de Codex');
  if (cuenta.identidad === identidad) return { cuenta, cambio: false };
  const perfiles = { ...cuenta.perfiles };
  const anterior = {};
  for (const campo of CAMPOS) anterior[campo] = cuenta[campo];
  const clave = cuenta.identidad || 'sin-identificar';
  perfiles[clave] = anterior;
  const perfil = perfiles[identidad] || { diario: null, historial: [], estadoSesion: null, estadoSemana: null, ultimaLectura: null,
    limiteDiario: 14, umbralAviso: 10, limitesPorDia: null };
  return { cuenta: { ...cuenta, ...perfil, identidad, perfiles }, cambio: true };
}
function estadoLectura({ actualizadoMs, error, consultando, intervaloMin, ahora = Date.now() }) {
  const edad = Number.isFinite(actualizadoMs) ? Math.max(0, ahora - actualizadoMs) : null;
  const antiguo = edad !== null && (Boolean(error) || edad > (intervaloMin + 2) * 60000);
  return { edadMin: edad === null ? null : Math.floor(edad / 60000), antiguo, consultando: Boolean(consultando) };
}
function hidratarLectura(uso) {
  if (!uso || !Number.isFinite(uso.actualizadoMs) || !Number.isFinite(uso.semana)) return null;
  const reinicio = new Date(uso.reinicio);
  if (!Number.isFinite(reinicio.getTime())) return null;
  const sesion5h = uso.sesion5h ? { ...uso.sesion5h, reinicio: new Date(uso.sesion5h.reinicio) } : null;
  if (sesion5h && !Number.isFinite(sesion5h.reinicio.getTime())) return null;
  return { ...uso, reinicio, sesion5h };
}
module.exports = { identidadCuenta, vincularPerfil, estadoLectura, hidratarLectura };
