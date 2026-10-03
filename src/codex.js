const { spawn } = require('node:child_process');
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
class ErrorUso extends Error {
  constructor(tipo, mensaje) { super(mensaje); this.tipo = tipo; }
}
function ejecutable() {
  if (process.env.CUPEX_CODEX_PATH) return process.env.CUPEX_CODEX_PATH;
  const raiz = path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin');
  if (fs.existsSync(raiz)) {
    const candidatos = fs.readdirSync(raiz).map((dir) => path.join(raiz, dir, 'codex.exe'))
      .filter((archivo) => fs.existsSync(archivo))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (candidatos.length) return candidatos[0];
  }
  return process.platform === 'win32' ? 'codex.exe' : 'codex';
}
// Solo consulta cuenta y límites. No crea chats ni turnos.
class ClienteCodex {
  constructor() { this.pendientes = new Map(); this.siguiente = 1; this.proceso = null; this.iniciando = null; this.escuchas = new Set(); }
  async iniciar() {
    if (!this.iniciando) this.iniciando = this.arrancar().catch((error) => { this.cerrar(); throw error; });
    return this.iniciando;
  }
  async arrancar() {
    const proc = spawn(ejecutable(), ['app-server'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proceso = proc;
    const lineas = readline.createInterface({ input: proc.stdout });
    lineas.on('line', (linea) => {
      let mensaje;
      try { mensaje = JSON.parse(linea); } catch { return; }
      const pendiente = this.pendientes.get(mensaje.id);
      if (pendiente) {
        this.pendientes.delete(mensaje.id);
        clearTimeout(pendiente.timer);
        if (mensaje.error) pendiente.reject(new ErrorUso('formato', mensaje.error.message || 'Error de Codex'));
        else pendiente.resolve(mensaje.result);
      } else if (mensaje.method) {
        for (const escucha of this.escuchas) escucha(mensaje);
      }
    });
    proc.stderr.resume(); // No registrar posibles datos privados.
    const fallar = () => { if (this.proceso === proc) this.cerrar(); };
    proc.on('error', fallar);
    proc.on('exit', fallar);
    proc.stdin.on('error', fallar);
    await this.enviar('initialize', { clientInfo: { name: 'cupex_widget', title: 'Cupex', version: '0.4.0' } });
    proc.stdin.write(JSON.stringify({ method: 'initialized', params: {} }) + '\n');
  }
  enviar(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.proceso) return reject(new ErrorUso('sin-internet', 'Instala Codex o configura CUPEX_CODEX_PATH.'));
      const id = this.siguiente++;
      const timer = setTimeout(() => {
        this.pendientes.delete(id);
        reject(new ErrorUso('sin-internet', 'Codex no respondió a tiempo'));
      }, 30000);
      this.pendientes.set(id, { resolve, reject, timer });
      this.proceso.stdin.write(JSON.stringify({ id, method, params }) + '\n');
    });
  }
  async consultar(method, params) { await this.iniciar(); return this.enviar(method, params); }
  cerrar() {
    const proc = this.proceso;
    this.proceso = null;
    this.iniciando = null;
    for (const pendiente of this.pendientes.values()) {
      clearTimeout(pendiente.timer);
      pendiente.reject(new ErrorUso('sin-internet', 'No se pudo conectar con Codex local'));
    }
    this.pendientes.clear();
    if (proc) proc.kill();
  }
}
module.exports = { ClienteCodex, ErrorUso, cliente: new ClienteCodex() };
