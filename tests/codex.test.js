const { test } = require('node:test');
const assert = require('node:assert/strict');
const { interpretar } = require('../src/uso');
const { procesarLectura, procesarSesion } = require('../src/calculo');
const bucket = (usedPercent, windowDurationMins, resetsAt = 1800000000) => ({ usedPercent, windowDurationMins, resetsAt });
test('usa la cuota Codex incluso si hay otros grupos de límites', () => {
 const x = interpretar({ rateLimits: {secondary: bucket(99,10080)}, rateLimitsByLimitId: {codex: {primary: bucket(12,300),secondary: bucket(24,10080),planType:'plus'}} });
 assert.equal(x.semana,24); assert.equal(x.sesion5h.porcentaje,12); assert.equal(x.plan.clave,'plus');
 assert.equal(x.reinicio.getTime(),1800000000000);
});
test('admite formato anterior y un período sin actividad', () => {
 const x=interpretar({rateLimits:{secondary:bucket(0,10080),primary:null}});
 assert.equal(x.semana,0);assert.equal(x.sesion5h,null);
});
test('no inventa cuota semanal si falta o tiene datos inválidos', () => {
 for(const secondary of [null,bucket(NaN,10080),bucket(-1,10080),bucket(101,10080),bucket(2,60),{...bucket(2,10080),resetsAt:'mañana'}]) {
  assert.throws(()=>interpretar({rateLimits:{secondary}}),e=>e.tipo==='formato');
 }
});
test('preserva duración real del período', () => {
 assert.equal(interpretar({rateLimits:{secondary:bucket(2,10080),primary:bucket(4,60)}}).sesion5h.minutos,60);
});
test('estima consumo desde primera lectura y acumula reinicio semanal', () => {
 const ahora=new Date('2026-10-03T15:00:00Z');
 const a=procesarLectura({semana:20,ahora,limite:14,umbralAviso:10});
 assert.equal(a.hoy,0);
 const b=procesarLectura({estado:a.estado,historial:a.historial,semana:25,ahora,limite:14,umbralAviso:10});
 assert.equal(b.hoy,5);
 const c=procesarLectura({estado:b.estado,historial:b.historial,semana:2,ahora,limite:14,umbralAviso:10});
 assert.equal(c.hoy,7);
});
test('alerta solo una vez por período y avisa después del reinicio', () => {
 const ahora=new Date('2026-10-03T15:00:00Z');
 const reinicio=new Date(ahora.getTime()+3600000);
 const a=procesarSesion({sesion5h:{porcentaje:90,reinicio},umbral:80,ahora});
 assert.deepEqual(a.alertas,['sesion-aviso']);
 const b=procesarSesion({estado:a.estado,sesion5h:{porcentaje:100,reinicio},umbral:80,ahora});
 assert.deepEqual(b.alertas,['sesion-limite']);
 const c=procesarSesion({estado:b.estado,sesion5h:{porcentaje:100,reinicio},umbral:80,ahora});
 assert.deepEqual(c.alertas,[]);
 const d=procesarSesion({estado:c.estado,sesion5h:null,umbral:80,ahora:reinicio});
 assert.deepEqual(d.alertas,['sesion-reiniciada']);
});
const { procesarSemana, proximaConsulta } = require('../src/cuotas');
test('alertas semanales: umbrales sin duplicados, salto directo y nueva semana', () => {
 const reinicio = new Date('2026-10-09T20:00:00Z');
 const a = procesarSemana({porcentaje:75,reinicio}); assert.equal(a.alerta,75);
 const b = procesarSemana({estado:a.estado,porcentaje:89,reinicio}); assert.equal(b.alerta,null);
 const c = procesarSemana({estado:b.estado,porcentaje:100,reinicio}); assert.equal(c.alerta,100);
 assert.equal(procesarSemana({estado:c.estado,porcentaje:100,reinicio}).alerta,null);
 assert.equal(procesarSemana({estado:c.estado,porcentaje:90,reinicio:new Date(reinicio.getTime()+604800000)}).alerta,90);
});
test('consulta justo después del reinicio aunque la última lectura sea reciente', () => {
 const ahora = 1800000000000;
 assert.deepEqual(proximaConsulta({ahora,ultimaConsulta:ahora,intervaloMs:900000,reinicios:[ahora+60000]}),{cuando:ahora+62000,porReinicio:true});
});
test('reinicios obsoletos o inválidos no producen bucles de consultas', () => {
 const ahora=1800000000000;
 assert.deepEqual(proximaConsulta({ahora,ultimaConsulta:ahora,intervaloMs:300000,reinicios:[ahora-10000,'inválido']}),{cuando:ahora+300000,porReinicio:false});
});
test('elige primero el reinicio más próximo o la consulta periódica', () => {
 const ahora=1800000000000;
 assert.equal(proximaConsulta({ahora,ultimaConsulta:ahora,intervaloMs:900000,reinicios:[ahora+800000,ahora+60000]}).cuando,ahora+62000);
 assert.equal(proximaConsulta({ahora,ultimaConsulta:ahora,intervaloMs:300000,reinicios:[ahora+800000]}).porReinicio,false);
});
