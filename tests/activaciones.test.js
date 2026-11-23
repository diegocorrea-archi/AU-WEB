import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularActivaciones, esPrimo, METAS_PRIMO } from '../src/lib/activaciones.js'
import { normalizeActividadesOn, normalizeActividadesOff } from '../src/lib/normalize.js'
const row = (embajador, tipoActividad, sku = 'PRIMO APERITIVO', fecha = '2026-11-02') => ({ embajador, tipoActividad, fecha, raw: { 'SKU PRIMO APERITIVO': sku } })
const ds = (on = [], off = []) => ({ actividadesOn: on, actividadesOff: off })
test('metas mensuales individuales suman ON=85 OFF=27', () => {
  assert.equal(METAS_PRIMO.ON.reduce((s, r) => s + r.meta, 0), 85)
  assert.equal(METAS_PRIMO.OFF.reduce((s, r) => s + r.meta, 0), 27)
})
test('primo requiere SKU válido; no confunde NA/N/A', () => {
  assert.equal(esPrimo(row('Ana', 'ACTIVACIÓN')), true)
  assert.equal(esPrimo(row('Ana', 'ACTIVACIÓN', 'N/A')), false)
  assert.equal(esPrimo(row('Ana', 'ACTIVACIÓN', '')), false)
})
test('ON calcula metas por persona, no por equipo fijo; ignora otros meses', () => {
  const d = calcularActivaciones(ds([
    row('Ana', 'VISITA DE MANTENIMIENTO'), row('Ana', 'CAPACITACIÓN'),
    row('Luis', 'ACTIVACIÓN'), row('Ana', 'ACTIVACIÓN', 'NA'),
    row('Ana', 'ACTIVACIÓN', 'PRIMO APERITIVO', '2026-10-02'),
  ]), { canal: 'ON', mes: '2026-11' })
  assert.equal(d.personas, 2); assert.equal(d.meta, 170); assert.equal(d.realizadas, 3)
  assert.equal(d.desglose.find((x) => x.id === 'VISITA DE MANTENIMIENTO').meta, 160)
})
test('sin meta se separa, sobrecumplimiento no se topa', () => {
  const actividades = [...Array.from({length: 22}, () => row('Ana', 'VISITA DE MANTENIMIENTO')), row('Ana', 'OTRA')]
  const d = calcularActivaciones(ds([], actividades), { canal: 'OFF', mes: '2026-11' })
  assert.equal(d.adicionales, 1); assert.equal(d.realizadas, 22)
  assert.equal(d.desglose[0].cumplimiento, 1.1)
})
test('OFF fecha de actividad FECHA tiene preferencia a marca temporal', () => {
  const [r] = normalizeActividadesOff([{ FECHA: '2026-11-05', 'Marca temporal': '10/31/2026', EMBAJADOR: 'ROCIO SANCHEZ', '¿QUÉ ACTIVIDAD VAS A REALIZAR?': 'ACTIVACIÓN', 'SKU PRIMO APERITIVO': 'PRIMO APERITIVO' }])
  assert.equal(r.fecha, '2026-11-05')
})
test('ON permite fecha serial de Sheets y actividad de columna L', () => {
  const [r] = normalizeActividadesOn([{ FECHA: 46328, EMBAJADOR: 'Ana', '¿QUÉ ACTIVIDAD VAS A REALIZAR?': 'CAPACITACIÓN', 'SKU PRIMO APERITIVO': 'RTD PRIMO' }])
  assert.equal(r.tipoActividad, 'CAPACITACIÓN'); assert.equal(esPrimo(r), true)
  assert.match(r.fecha, /^2026-/)
})
