const REPOSITORIO = 'jair1c/Cupex';
function versionNumeros(valor) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(valor));
  return m ? m.slice(1).map(Number) : null;
}
function esMasNueva(nueva, actual) {
  const a=versionNumeros(nueva), b=versionNumeros(actual);
  if (!a || !b) return false;
  for(let i=0;i<3;i++) { if(a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}
function interpretarRelease(release, actual) {
  if (!release || release.draft || release.prerelease || !versionNumeros(release.tag_name)) throw new Error('Release no compatible');
  const version = release.tag_name.replace(/^v/,'');
  const base = 'https://github.com/' + REPOSITORIO + '/releases/';
  const asset = (release.assets || []).find(a => a.name === 'Instalar-Cupex-' + version + '.exe' &&
    typeof a.browser_download_url === 'string' && a.browser_download_url.startsWith(base + 'download/'));
  const url = asset ? asset.browser_download_url : release.html_url;
  if (typeof url !== 'string' || !url.startsWith(base)) throw new Error('URL de versión no válida');
  return { estado: esMasNueva(version,actual) ? 'nueva' : 'actual', version, url, instalador: Boolean(asset) };
}
async function comprobar(actual, fetchImpl = fetch) {
  try {
    const r = await fetchImpl('https://api.github.com/repos/' + REPOSITORIO + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Cupex/' + actual }, signal: AbortSignal.timeout(15000),
    });
    if (r.status === 404) return { estado: 'sinVersiones' };
    if (!r.ok) return { estado: 'error' };
    return interpretarRelease(await r.json(),actual);
  } catch { return { estado: 'error' }; }
}
module.exports = { comprobar, interpretarRelease, esMasNueva, REPOSITORIO };
