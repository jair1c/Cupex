const { cliente, ErrorUso } = require('./codex');
const { identidadCuenta } = require('./perfiles');
function ventana(valor) {
  if (!valor || !Number.isFinite(valor.usedPercent) || valor.usedPercent < 0 || valor.usedPercent > 100 ||
      !Number.isFinite(valor.resetsAt) || !Number.isFinite(valor.windowDurationMins) || valor.windowDurationMins <= 0) return null;
  const reinicio = new Date(valor.resetsAt * 1000);
  if (Number.isNaN(reinicio.getTime())) return null;
  return { porcentaje: valor.usedPercent, reinicio, minutos: valor.windowDurationMins };
}
function interpretar(respuesta) {
  const limites = respuesta?.rateLimitsByLimitId?.codex || respuesta?.rateLimits;
  const semanal = ventana(limites?.secondary);
  const corta = ventana(limites?.primary);
  // No inventar una cuota semanal si el plan no la informa.
  if (!semanal || semanal.minutos !== 10080) throw new ErrorUso('formato', 'Este plan no informa una cuota semanal compatible');
  return {
    semana: semanal.porcentaje, reinicio: semanal.reinicio,
    duracionSemanaMin: semanal.minutos, sesion5h: corta,
    desglose: null, plan: limites.planType ? { clave: limites.planType, multiplo: null } : null,
  };
}
async function leerUso(alIdentificar = () => {}) {
  const { account } = await cliente.consultar('account/read', { refreshToken: false });
  if (!account || account.type !== 'chatgpt') throw new ErrorUso('sesion', 'Inicia sesión en Codex con ChatGPT');
  const identidad = identidadCuenta(account);
  if (!identidad) throw new ErrorUso('identidad', 'Codex no informa una identidad de cuenta');
  alIdentificar(identidad);
  const resultado = interpretar(await cliente.consultar('account/rateLimits/read'));
  const segunda = await cliente.consultar('account/read', { refreshToken: false });
  if (identidadCuenta(segunda.account) !== identidad) throw new ErrorUso('identidad', 'La cuenta cambió durante la consulta');
  resultado.plan = resultado.plan || { clave: account.planType, multiplo: null };
  return resultado;
}
module.exports = { leerUso, interpretar, ErrorUso };
