import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUniverso, canon } from '../src/lib/universo.js'

const mk = (changes={}) => ({ cuenta:'CAFE PRUEBA',status:'ACTIVO', operador:'VENDEDORA A',brand:'Primo',plaza:'CDMX', ...changes })
const activity = (changes={}) => ({fecha:'2026-10-11', cliente:'CAFE PRUEBA',embajador:'VENDEDORA A',tipoActividad:'CAPACITACIÓN',raw:{},...changes})
const venta = (changes={}) => ({fecha:'2026-11-12',cliente:'CAFE PRUEBA',producto:'PRIMO APERITIVO',brand:'Primo', concepto:'VENTA',cantidad:5,monto:1500,...changes})
const sell = (changes={}) => ({fecha:'2026-11-10',cliente:'CAFE PRUEBA',producto:'PRIMO APERITIVO',brand:'Primo',concepto:'VENTA',cantidad:3,...changes})
const base = { universoOn:[mk(), mk({cuenta:'CAFE SIN VISITA'}), mk({cuenta:'CUENTA INACTIVA',status:'INACTIVO'})],universoOff:[],actividadesOn:[activity(),activity({fecha:'2026-11-08',tipoActividad:'ACTIVACIÓN'})],actividadesOff:[],ventas:[venta(),venta({producto:'PRIMO RTD LATA',cantidad:12,monto:360}),venta({concepto:'BONIFICACION',cantidad:20,monto:9999})],sellOut:[sell(),sell({producto:'PRIMO RTD LATA',cantidad:10}),sell({concepto:'DEVOLUCION',cantidad:200})] }
test('cuentas activas y cobertura por vendedor actual, cualquier actividad cuenta',()=>{
 const {resumen,cuentas,vendedores}=buildUniverso(base,'2026-11')
 assert.equal(resumen.total,2)
 assert.equal(resumen.visitadas,1)
 assert.equal(resumen.pendientes,1)
 assert.equal(vendedores[0].universo,2)
 assert.equal(cuentas.find(c=>c.cuenta==='CAFE SIN VISITA').ultimaVisita,null)
})
test('última visita histórica aunque no ocurra en el mes, excluyendo fechas posteriores',()=>{
 const r=buildUniverso({...base, actividadesOn:[activity(),activity({fecha:'2026-12-01'})]},'2026-11')
 assert.equal(r.cuentas.find(c=>c.cuenta==='CAFE PRUEBA').ultimaVisita,'2026-10-11')
 assert.equal(r.resumen.visitadas,0)
})
test('separación RTD y venta pesos y desplazamiento unidades',()=>{
 const {resumen}=buildUniverso(base,'2026-11')
 assert.equal(resumen.botellas,5)
 assert.equal(resumen.ventas,1860)
 assert.equal(resumen.rtdUnidades,12)
 assert.equal(resumen.rtdPesos,360)
 assert.equal(resumen.sellOutBotellas,3)
 assert.equal(resumen.sellOutRtd,10)
})
test('no cuenta actividades de otro embajador ni de otro canal',()=>{
 const r=buildUniverso({...base,actividadesOn:[activity({embajador:'VENDEDOR X'})],actividadesOff:[activity()]},'2026-10')
 assert.equal(r.resumen.visitadas,0)
})
test('normalización de acentos y espacios y deduplicación de cuentas en mismo vendedor',()=>{
 const {cuentas}=buildUniverso({...base,universoOn:[mk({cuenta:'CAFÉ  PRUEBA'}),mk({cuenta:'Cafe Prueba'})]},'2026-11')
 assert.equal(cuentas.length,1)
 assert.equal(canon('CAFÉ PRUEBA'),canon('Cafe  Prueba'))
})
test('metas separadas por canal aun si la cuenta tiene el mismo nombre',()=>{
 const r=buildUniverso({...base,universoOff:[{...mk(),_sheet:'UNIVERSO_OFF'}]},'2026-11')
 assert.equal(r.resumen.total,3)
 assert.equal(r.cuentas.find(c=>c.canal==='OFF').visitada,false)
})
test('filtro Primo separa las marcas de venta directa y desplazamiento',()=>{
 const r=buildUniverso({...base, ventas:[...base.ventas,venta({brand:'Unión',producto:'UNIÓN UNO',cantidad:8,monto:2000})],sellOut:[...base.sellOut,sell({brand:'Unión',producto:'UNIÓN UNO',cantidad:6})]},'2026-11',{brand:'Primo'})
 assert.equal(r.resumen.ventas,1860)
 assert.equal(r.resumen.sellOutBotellas,3)
})
