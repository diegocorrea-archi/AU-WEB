import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUniversoOff } from '../src/lib/normalize.js'
import { buildUniverso } from '../src/lib/universo.js'

test('UNIVERSO_OFF admite encabezados normales y variantes', () => {
  const r = normalizeUniversoOff([
    {'Nombre de cuenta':'BODEGA A','STATUS':'ACTIVO','Operador':'VENDEDOR 1','MARCA':'Unión'},
    {'NOMBRE DE LA CUENTA':'BODEGA B','Estatus':'ACTIVO','VENDEDOR':'VENDEDOR 2','Brand':'Primo'},
    {' Nombre de cuenta ':'BODEGA C','status':'INACTIVO','operador':'VENDEDOR 3','marca':'Primo'},
  ])
  assert.equal(r[0].cuenta, 'BODEGA A')
  assert.equal(r[1].operador, 'VENDEDOR 2')
  const result = buildUniverso({universoOff:r}, '2026-11', {canal:'OFF'})
  assert.equal(result.resumen.total, 2)
  assert.deepEqual(result.vendedores.map(x=>x.embajador), ['VENDEDOR 1','VENDEDOR 2'])
})

test('OFF debe contar visitas de cualquier embajador asignado', () => {
  const r = normalizeUniversoOff([{'Nombre de cuenta':'BODEGA X','STATUS':'ACTIVO','Operador':'VENDEDORA NUEVA','MARCA':'Primo'}])
  const result = buildUniverso({universoOff:r,actividadesOff:[{fecha:'2026-11-03',cliente:'BODEGA X',embajador:'VENDEDORA NUEVA',tipoActividad:'CAPACITACIÓN'}]}, '2026-11', {canal:'OFF'})
  assert.equal(result.resumen.visitadas,1)
})
