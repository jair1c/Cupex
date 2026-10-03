const { test }=require('node:test');
const assert=require('node:assert/strict');
const { identidadCuenta, vincularPerfil, estadoLectura, hidratarLectura }=require('../src/perfiles');
const { procesarSemana }=require('../src/cuotas');
const { esMasNueva, interpretarRelease, comprobar }=require('../src/actualizaciones');
test('la identidad se normaliza y nunca guarda el correo',()=>{
 assert.equal(identidadCuenta({email:'USER@example.com'}),identidadCuenta({email:' user@example.com '}));
 assert.equal(identidadCuenta({email:null}),null);
 assert.equal(identidadCuenta({email:'user@example.com'}).length,64);
});
test('cambiar de cuenta separa datos y recupera el perfil al volver',()=>{
 const a={identidad:'a',historial:[{dia:'2026-10-03',uso:5}],diario:{ultimaLectura:30},estadoSemana:{enviados:[75]},limiteDiario:20};
 const b=vincularPerfil(a,'b').cuenta;
 assert.deepEqual(b.historial,[]);assert.equal(b.diario,null);assert.equal(b.limiteDiario,14);
 const vuelta=vincularPerfil({...b,historial:[{dia:'2026-10-03',uso:1}]},'a').cuenta;
 assert.deepEqual(vuelta.historial,a.historial);assert.equal(vuelta.diario.ultimaLectura,30);
 assert.equal(vuelta.perfiles.b.historial[0].uso,1);
});
test('migración conserva historial antiguo sin adjudicarlo a una cuenta desconocida',()=>{
 const x=vincularPerfil({historial:[{uso:7}]},'nueva').cuenta;
 assert.equal(x.perfiles['sin-identificar'].historial[0].uso,7);assert.deepEqual(x.historial,[]);
 assert.throws(()=>vincularPerfil(x,null));
});
test('última lectura fallida o demasiado antigua se marca como desactualizada',()=>{
 const ahora=1800000000000;
 assert.equal(estadoLectura({actualizadoMs:ahora-60000,intervaloMin:15,ahora}).antiguo,false);
 assert.equal(estadoLectura({actualizadoMs:ahora-60000,intervaloMin:15,error:'offline',ahora}).antiguo,true);
 assert.equal(estadoLectura({actualizadoMs:ahora-18*60000,intervaloMin:15,ahora}).antiguo,true);
 assert.equal(estadoLectura({intervaloMin:15,ahora}).edadMin,null);
});
test('hidrata las fechas de la caché y rechaza datos corruptos',()=>{
 const x=hidratarLectura({semana:20,actualizadoMs:12345,reinicio:'2026-10-10T00:00:00Z',sesion5h:{reinicio:'2026-10-03T18:00:00Z'}});
 assert.ok(x.reinicio instanceof Date);assert.ok(x.sesion5h.reinicio instanceof Date);
 assert.equal(hidratarLectura({semana:1,actualizadoMs:12345,reinicio:'inválido'}),null);
});
test('respeta umbrales semanales personalizados y alertas desactivadas',()=>{
 const reinicio=new Date('2026-10-09T20:00:00Z');
 assert.equal(procesarSemana({porcentaje:60,reinicio,umbrales:[50,80]}).alerta,50);
 assert.equal(procesarSemana({porcentaje:100,reinicio,activadas:false}).alerta,null);
});
test('compara versiones numéricamente y descarta previews',()=>{
 assert.equal(esMasNueva('v0.10.0','0.9.0'),true);
 assert.equal(esMasNueva('0.4.0','0.4.0'),false);
 assert.equal(esMasNueva('1.0.0-beta','0.4.0'),false);
});
test('nueva versión válida abre un instalador del repositorio elegido',()=>{
 const release={tag_name:'v0.5.0',html_url:'https://github.com/jair1c/Cupex/releases/tag/v0.5.0',assets:[{name:'Instalar-Cupex-0.5.0.exe',browser_download_url:'https://github.com/jair1c/Cupex/releases/download/v0.5.0/Instalar-Cupex-0.5.0.exe'}]};
 assert.equal(interpretarRelease(release,'0.4.0').estado,'nueva');
 assert.equal(interpretarRelease(release,'0.4.0').instalador,true);
 assert.throws(()=>interpretarRelease({...release,assets:[],html_url:'https://example.org'},'0.4.0'));
});
test('sin releases y errores de red se distinguen de estar actualizado',async()=>{
 assert.equal((await comprobar('0.4.0',async()=>({status:404}))).estado,'sinVersiones');
 assert.equal((await comprobar('0.4.0',async()=>{throw new Error('offline')})).estado,'error');
});
