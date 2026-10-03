// Una cuenta vinculada a la sesión local de Codex. Desconectar el widget
// conserva la sesión de Codex y evita interferir con la aplicación principal.
const { shell } = require('electron');
const { cliente } = require('./codex');
const almacen = require('./almacen');
const cuentas = new Map();
let avisarCambio = () => {};
let loginPendiente = false;
function cambiarEstado(id, estado) {
  if (!cuentas.has(id) || cuentas.get(id) === estado) return;
  cuentas.set(id, estado);
  avisarCambio(id, estado);
}
async function registrar(cuenta, simulada = false) {
  let estado = 'sin-sesion';
  if (simulada) estado = 'conectado';
  else if (!cuenta.desconectada) {
    try {
      const { account } = await cliente.consultar('account/read', { refreshToken: false });
      if (account?.type === 'chatgpt') estado = 'conectado';
    } catch { estado = 'conectado'; } // La lectura mostrará el error de conexión.
  }
  cuentas.set(cuenta.id, estado);
  return estado;
}
async function iniciar(lista, alCambiar, simulada = false) {
  avisarCambio = alCambiar;
  for (const cuenta of lista) await registrar(cuenta, simulada);
}
function estadoDe(id) { return cuentas.get(id) || 'sin-sesion'; }
function marcarExpirada(id) { cambiarEstado(id, 'expirada'); }
async function abrirLogin(id) {
  if (!cuentas.has(id) || loginPendiente) return;
  loginPendiente = true;
  let escuchar;
  let timer;
  const limpiar = () => { loginPendiente = false; clearTimeout(timer); cliente.escuchas.delete(escuchar); };
  try {
    const { account } = await cliente.consultar('account/read', { refreshToken: false });
    if (account?.type === 'chatgpt') {
      almacen.guardarCuenta(id, { desconectada: false });
      cambiarEstado(id, 'conectado');
      limpiar();
      return;
    }
    escuchar = (mensaje) => {
      if (mensaje.method !== 'account/login/completed') return;
      if (mensaje.params?.success) {
        almacen.guardarCuenta(id, { desconectada: false });
        cambiarEstado(id, 'conectado');
      } else marcarExpirada(id);
      limpiar();
    };
    cliente.escuchas.add(escuchar);
    timer = setTimeout(() => { marcarExpirada(id); limpiar(); }, 5 * 60 * 1000);
    const resultado = await cliente.consultar('account/login/start', { type: 'chatgpt' });
    const url = new URL(resultado.authUrl);
    if (url.protocol !== 'https:' || !['auth.openai.com', 'chatgpt.com'].includes(url.hostname)) throw new Error('URL inesperada');
    await shell.openExternal(url.href);
  } catch { marcarExpirada(id); limpiar(); }
}
async function cerrarSesion(id) {
  almacen.guardarCuenta(id, { desconectada: true });
  cambiarEstado(id, 'sin-sesion');
}
async function olvidar(id) { cuentas.delete(id); }
module.exports = { registrar, iniciar, estadoDe, marcarExpirada, abrirLogin, cerrarSesion, olvidar };
