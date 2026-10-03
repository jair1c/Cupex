const { app, BrowserWindow }=require('electron');
const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
const carpeta=path.join(app.getPath('appData'),'Cupex-verificacion');fs.mkdirSync(carpeta,{recursive:true});
fs.writeFileSync(path.join(carpeta,'datos.json'),JSON.stringify({modo:'normal',idioma:'es',historial:[{dia:'2026-10-02',uso:5,limite:14}]}));
require('../src/main');
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
const limite=setTimeout(()=>{console.error('Tiempo agotado');app.exit(1);},60000);
app.whenReady().then(async()=>{
 try{
  let ventana,datos;
  for(let i=0;i<150;i++){
   ventana=BrowserWindow.getAllWindows()[0];
   if(ventana && !ventana.webContents.isLoading()){
    datos=await ventana.webContents.executeJavaScript('window.widget?.obtenerUso()');
    if(datos?.uso&&!datos.error)break;
   }
   await pausa(200);
  }
  assert.ok(datos?.uso&&!datos.error,'Lectura real inicial');
  const js=code=>ventana.webContents.executeJavaScript(code);
  const modUso=require('../src/uso');const real=modUso.leerUso;
  const antes=datos.uso.actualizadoMs;
  modUso.leerUso=async()=>{throw new modUso.ErrorUso('sin-internet','Fallo simulado para verificación');};
  const respuesta=await js('window.widget.actualizarManual()');
  assert.equal(respuesta.ok,false);
  const fallo=await js('window.widget.obtenerUso()');
  assert.equal(fallo.uso.actualizadoMs,antes);assert.equal(fallo.uso.semana,datos.uso.semana);assert.ok(fallo.error);
  await pausa(1200);
  assert.ok(await js("document.body.classList.contains('datos-antiguos')"));
  const salida=path.join(__dirname,'..','artifacts');fs.mkdirSync(salida,{recursive:true});
  fs.writeFileSync(path.join(salida,'cupex-datos-antiguos.png'),(await ventana.webContents.capturePage()).toPNG());
  const cache=JSON.parse(fs.readFileSync(path.join(carpeta,'datos.json'))).cuentas[0].ultimaLectura;
  assert.equal(cache.actualizadoMs,antes);
  const hist=await js('window.widget.obtenerHistorial()');
  assert.ok(hist.perfiles.some(p=>p.legado),'Historial anterior preservado');
  const archivo=await js("window.widget.obtenerHistorial('sin-identificar')");
  assert.equal(archivo.dias.find(d=>d.dia==='2026-10-02').uso,5);
  const actuales=await js('window.widget.obtenerAjustes()');
  const nuevos={...actuales,visualizacion:'restante',umbralesSemana:[50,85],alertasSemana:false};
  assert.equal((await js('window.widget.guardarAjustes('+JSON.stringify(nuevos)+')')).ok,true);
  await pausa(800);
  const porcentaje=await js("document.getElementById('semana-porcentaje').textContent");
  assert.ok(porcentaje.includes('libre'));assert.ok(!porcentaje.includes(' · '));
  assert.deepEqual((await js('window.widget.obtenerAjustes()')).umbralesSemana,[50,85]);
  assert.equal((await js('window.widget.guardarAjustes('+JSON.stringify({...nuevos,umbralesSemana:[90,50]})+')')).ok,false);
  assert.equal((await js('window.widget.guardarAjustes('+JSON.stringify({...nuevos,visualizacion:'usado'})+')')).ok,true);
  await pausa(800);
  assert.ok(!(await js("document.getElementById('semana-porcentaje').textContent")).includes('libre'));
  await pausa(Math.max(0,10500-(Date.now()-antes)));
  modUso.leerUso=real;
  assert.equal((await js('window.widget.actualizarManual()')).ok,true);
  await pausa(1200);
  assert.ok(!(await js("document.body.classList.contains('datos-antiguos')")));
  const recuperado=await js('window.widget.obtenerUso()');assert.ok(recuperado.uso.actualizadoMs>antes);
  const original={...actuales,visualizacion:'ambos'};
  assert.equal((await js('window.widget.guardarAjustes('+JSON.stringify(original)+')')).ok,true);
  await js("document.getElementById('boton-historial').click()");
  await pausa(1000);
  assert.ok(await js("!document.getElementById('historial-perfiles').hidden"));
  await js("document.getElementById('perfil-historial').value='sin-identificar';document.getElementById('perfil-historial').dispatchEvent(new Event('change'))");
  await pausa(500);
  assert.ok(await js("document.getElementById('perfil-historial').getBoundingClientRect().top >= document.getElementById('vista-historial').getBoundingClientRect().top"));
  fs.writeFileSync(path.join(salida,'cupex-historial-perfiles.png'),(await ventana.webContents.capturePage()).toPNG());
  await js("window.widget.alternarModo('completo')");
  await pausa(1500);
  fs.writeFileSync(path.join(salida,'cupex-completo-perfiles.png'),(await ventana.webContents.capturePage()).toPNG());
  await js("window.widget.alternarModo('completo')");
  await pausa(1500);
  await js("document.getElementById('boton-ajustes').click()");
  await pausa(1000);
  await js("document.getElementById('comprobar-version').scrollIntoView({block:'center'})");
  await pausa(500);
  fs.writeFileSync(path.join(salida,'cupex-versiones.png'),(await ventana.webContents.capturePage()).toPNG());
  assert.equal((await js('window.widget.versionApp()')).version,'0.4.0');
  const v=await js('window.widget.comprobarVersion()');assert.ok(['sinVersiones','actual','nueva','error'].includes(v.estado));
  console.log(JSON.stringify({ok:true,cached:true,manual:true,recovery:true,preferences:true,legacyHistory:true,updates:v.estado}));
  clearTimeout(limite);app.quit();
 }catch(e){console.error(e);clearTimeout(limite);app.exit(1);}
});
