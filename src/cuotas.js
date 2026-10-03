// Alertas persistentes y programación de consultas, independientes de Electron.
function procesarSemana({ estado, porcentaje, reinicio, umbrales = [75, 90], activadas = true }) {
  const reinicioMs = Math.round(new Date(reinicio).getTime() / 60000) * 60000;
  const enviados = estado?.reinicioMs === reinicioMs ? [...(estado.enviados || [])] : [];
  const cruzados = activadas ? [...umbrales, 100].filter(umbral => porcentaje >= umbral && !enviados.includes(umbral)) : [];
  // Si una lectura salta varios umbrales, emitir solo el más relevante.
  return { estado: { reinicioMs, enviados: [...new Set([...enviados, ...cruzados])] },
    alerta: cruzados.length ? Math.max(...cruzados) : null };
}
function proximaConsulta({ ahora, ultimaConsulta, intervaloMs, reinicios = [] }) {
  const normal = Math.max(ahora + 1000, ultimaConsulta + intervaloMs);
  const futuros = reinicios.map(fecha => new Date(fecha).getTime() + 2000)
    .filter(ms => Number.isFinite(ms) && ms > ahora);
  const reinicio = Math.min(...futuros);
  return reinicio < normal ? { cuando: reinicio, porReinicio: true } : { cuando: normal, porReinicio: false };
}
module.exports = { procesarSemana, proximaConsulta };
