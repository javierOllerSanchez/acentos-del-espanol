/**
 * Registro de «Cartografía dialectal del español» en Google Sheets.
 *
 * Recibe los eventos que envía la web (POST con un JSON: un evento o una lista de eventos)
 * y los guarda en la pestaña «Eventos». Después rehace la pestaña «Resumen»:
 * una tabla de equipos × regiones con ✓ en las regiones marcadas como vistas.
 *
 * Despliegue: mira el README (sección «Conectar con Google Sheets»).
 */

const HOJA_EVENTOS = 'Eventos';
const HOJA_RESUMEN = 'Resumen';
const CABECERA = ['Fecha', 'Equipo', 'Integrantes', 'Región', 'Acción', 'Recurso', 'Recibido'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let datos = JSON.parse(e.postData.contents);
    if (!Array.isArray(datos)) datos = [datos];
    const hoja = hoja_(HOJA_EVENTOS, CABECERA);
    const ahora = new Date();
    const filas = datos
      .filter(function (ev) { return ev && ev.equipo; })
      .map(function (ev) {
        return [ev.fecha || '', ev.equipo || '', ev.integrantes || '', ev.region || '', ev.accion || '', ev.recurso || '', ahora];
      });
    if (filas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, CABECERA.length).setValues(filas);
      actualizarResumen();
    }
    return respuesta_({ ok: true, guardados: filas.length });
  } catch (err) {
    return respuesta_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Para comprobar que la URL funciona: ábrela en el navegador y debe decir «ok».
function doGet() {
  return respuesta_({ ok: true, mensaje: 'Registro de Cartografía dialectal del español funcionando' });
}

/** Rehace la pestaña «Resumen» (equipos en filas, regiones en columnas). */
function actualizarResumen() {
  const eventos = hoja_(HOJA_EVENTOS, CABECERA).getDataRange().getValues().slice(1);
  const equipos = [], regiones = [], vistas = {}, abiertas = {};

  // Los eventos están en orden: el último «Marcar»/«Desmarcar» de cada equipo y región es el que cuenta.
  eventos.forEach(function (f) {
    const equipo = String(f[1]), region = String(f[3]), accion = String(f[4]);
    if (!equipo || !region) return;
    if (equipos.indexOf(equipo) < 0) equipos.push(equipo);
    if (regiones.indexOf(region) < 0) regiones.push(region);
    const clave = equipo + '|' + region;
    if (accion === 'Abrir región') abiertas[clave] = true;
    if (accion === 'Marcar como vista') vistas[clave] = true;
    if (accion === 'Desmarcar vista') delete vistas[clave];
  });
  regiones.sort();

  const tabla = [['Equipo'].concat(regiones).concat(['Total vistas'])];
  equipos.forEach(function (eq) {
    let total = 0;
    const fila = regiones.map(function (r) {
      const clave = eq + '|' + r;
      if (vistas[clave]) { total++; return '✓'; }
      return abiertas[clave] ? 'abierta' : '';
    });
    tabla.push([eq].concat(fila).concat([total]));
  });

  const hoja = hoja_(HOJA_RESUMEN);
  hoja.clear();
  hoja.getRange(1, 1, tabla.length, tabla[0].length).setValues(tabla);
  hoja.getRange(1, 1, 1, tabla[0].length).setFontWeight('bold').setBackground('#e7eef7');
  hoja.setFrozenRows(1);
  hoja.setFrozenColumns(1);
}

function hoja_(nombre, cabecera) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(nombre);
  if (!hoja) hoja = libro.insertSheet(nombre);
  if (cabecera && hoja.getLastRow() === 0) {
    hoja.appendRow(cabecera);
    hoja.getRange(1, 1, 1, cabecera.length).setFontWeight('bold').setBackground('#e7eef7');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function respuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
