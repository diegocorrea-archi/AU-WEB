import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyDataset, emptyFilters, applyFilters, computeExecutiveKpis, computeExecutiveCharts, computeVentasCharts, computeSellOutCharts } from '../src/lib/kpis.js'

const plan = (semana, cliente='CLIENTE A') => ({ semana, embajador:'ANA', porDia:{ lunes:[cliente], martes:[], miercoles:[], jueves:[], viernes:[] } })
const visit = (semana, cliente='CLIENTE A') => ({ semana, embajador:'ANA', cliente, esVisitaMantenimiento:true, fecha:semana })
const data = (patch={}) => ({...emptyDataset, ...patch})

test('visitas de otra semana no cumplen planes ejecutivos', () => {
  const filtered = applyFilters(data({ planeacion:[plan('2026-11-02')], actividadesOn:[visit('2026-11-09')] }), emptyFilters)
  const kpi = computeExecutiveKpis(filtered)
  assert.equal(kpi.planeadas,1)
  assert.equal(kpi.ejecutadas,0)
  assert.equal(kpi.cumplimientoPlaneacion,0)
})

test('visita en misma semana y embajador sí cumple', () => {
  const filtered = applyFilters(data({ planeacion:[plan('2026-11-02')], actividadesOn:[visit('2026-11-02')] }), emptyFilters)
  assert.equal(computeExecutiveKpis(filtered).ejecutadas,1)
})

test('fecha filtra semanas de planeación por intersección lunes-viernes', () => {
  const filtered = applyFilters(data({ planeacion:[plan('2026-11-02'),plan('2026-11-09')] }), {...emptyFilters, fechaInicio:'2026-11-05', fechaFin:'2026-11-06'})
  assert.deepEqual(filtered.planeacion.map(p=>p.semana), ['2026-11-02'])
})

test('conceptos de sell out preservan VENTA y BONIFICACIONES', () => {
  const so = ['VENTA','BONIFICACIONES','SAMPLEO'].map(concepto=>({concepto}))
  const filtered=applyFilters(data({sellOut:so}),emptyFilters)
  assert.equal(filtered.sellOut.length,2)
})

test('meses se ordenan cronológicamente aunque las filas no lo estén', () => {
  const ventas = [{anio:2026,mes:12,monto:30,cantidad:3,concepto:'VENTA'}, {anio:2025,mes:11,monto:10,cantidad:1,concepto:'VENTA'}, {anio:2026,mes:1,monto:20,cantidad:2,concepto:'VENTA'}]
  const f=applyFilters(data({ventas}),emptyFilters)
  assert.deepEqual(computeExecutiveCharts(f).ventaMensual.map(v=>v.name),['Nov 2025','Ene 2026','Dic 2026'])
  assert.deepEqual(computeVentasCharts(f).botellasMensual.map(v=>v.name),['Nov 2025','Ene 2026','Dic 2026'])
  const out=applyFilters(data({sellOut:ventas.map(r=>({...r}))}),emptyFilters)
  assert.deepEqual(computeSellOutCharts(out).tendenciaMensual.map(v=>v.name),['Nov 2025','Ene 2026','Dic 2026'])
})
