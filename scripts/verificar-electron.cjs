const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const errores=[];
const carpetaPrueba=path.join(app.getPath('appData'),'Cupex-verificacion');
fs.mkdirSync(carpetaPrueba,{recursive:true});
fs.writeFileSync(path.join(carpetaPrueba,'datos.json'),JSON.stringify({modo:'normal',idioma:'es'}));
require('../src/main');
const limite=setTimeout(()=>{ console.error('Verificación agotó el tiempo');app.exit(1); },45000);
app.whenReady().then(async()=>{
 try {
  let ventana;
  for(let i=0;i<100;i++) {
   ventana=BrowserWindow.getAllWindows()[0];
   if(ventana) break;
   await new Promise(r=>setTimeout(r,200));
  }
  assert.ok(ventana,'Existe la ventana');
  ventana.webContents.on('console-message',(_event,level,message)=>{if(level===3) errores.push(message);});
  ventana.webContents.on('render-process-gone',()=>errores.push('Renderer cerrado'));
  let datos;
  for(let i=0;i<100;i++) {
   if(!ventana.webContents.isLoading()) {
    datos=await ventana.webContents.executeJavaScript('window.widget?.obtenerUso()');
    if(datos?.uso && !datos.error) break;
   }
   await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(datos?.uso && !datos.error,'La interfaz recibe límites reales');
  assert.ok(datos.uso.plan,'Plan disponible');
  await new Promise(r=>setTimeout(r,1200));
  const salida=path.join(__dirname,'..','artifacts');fs.mkdirSync(salida,{recursive:true});
  fs.writeFileSync(path.join(salida,'cupex-normal.png'),(await ventana.webContents.capturePage()).toPNG());
  await ventana.webContents.executeJavaScript("window.widget.alternarModo('completo')");
  await new Promise(r=>setTimeout(r,1500));
  fs.writeFileSync(path.join(salida,'cupex-completo.png'),(await ventana.webContents.capturePage()).toPNG());
  const texto=await ventana.webContents.executeJavaScript('document.body.textContent');
  assert.ok(texto.includes('Hoy ≈'));
  assert.ok(texto.includes('% libre'),'Saldo restante visible');
  assert.ok(!texto.includes('Claude'));
  assert.equal(errores.length,0,errores.join('\n'));
  await ventana.webContents.executeJavaScript("window.widget.alternarModo('completo')");
  await new Promise(r=>setTimeout(r,1200));
  await ventana.webContents.executeJavaScript("document.querySelector('[data-panel=ajustes]').click()");
  await new Promise(r=>setTimeout(r,1200));
  assert.ok(await ventana.webContents.executeJavaScript("document.getElementById('panel').getAttribute('aria-hidden') === 'false'"));
  fs.writeFileSync(path.join(salida,'cupex-ajustes.png'),(await ventana.webContents.capturePage()).toPNG());
  assert.equal(errores.length,0,errores.join('\n'));
  console.log(JSON.stringify({ok:true,semana:datos.uso.semana,periodo:datos.uso.sesion5h?.porcentaje,plan:datos.uso.plan.clave}));
  clearTimeout(limite);app.quit();
 }catch(e){ console.error(e.message);clearTimeout(limite);app.exit(1); }
});
