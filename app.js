"use strict";

/* =========================================================
   CONFIGURACIÓN (el profesorado puede cambiar estos valores)
   ========================================================= */
// URL de la aplicación web de Google Apps Script (termina en /exec).
// Déjala vacía ("") para guardar el registro solo en este dispositivo.
const APPS_SCRIPT_URL = "";
// PIN del panel del profesor (se abre pulsando 5 veces el logo, o con Ctrl+Mayús+P).
const PIN_PROFESOR = "1234";
// A partir de este nivel de zoom España se ve dividida en regiones.
const ZOOM_REGIONES_ES = 3.2;
// Segundos que un equipo debe tener abierta una región para que cuente como explorada.
const SEGUNDOS_VISTA = 180;

/* ========================================================= */

const $ = (s, el = document) => el.querySelector(s);
const menosMovimiento = matchMedia("(prefers-reduced-motion: reduce)");
const dur = ms => (menosMovimiento.matches ? 0 : ms);
const esMovil = () => matchMedia("(max-width: 760px)").matches;
const esAncho = () => matchMedia("(min-width: 1280px)").matches;

const almacen = {
  get(k, def) {
    try { const v = localStorage.getItem("acentos." + k); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(k, v) {
    try { localStorage.setItem("acentos." + k, JSON.stringify(v)); } catch { /* almacenamiento no disponible */ }
  },
};

// Crea elementos del DOM sin usar innerHTML (el contenido viene de un JSON editable).
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const svgIcono = d => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("aria-hidden", "true");
  s.innerHTML = d; // solo iconos fijos de este archivo
  return s;
};
const ICO_PLAY = '<path d="M8 5.5v13l11-6.5z"/>';
const ICO_PAUSA = '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>';

/* ===== Estado ===== */
let REGIONES = [];
const porId = new Map();
let equipo = almacen.get("equipo", null);
let seleccion = null;

const vistasDe = nombre => new Set(almacen.get("vistas", {})[nombre] || []);
let vistas = new Set();

/* =========================================================
   REGISTRO DE EVENTOS (localStorage + Google Sheets)
   ========================================================= */
function registrar(accion, region, recurso = "") {
  if (!equipo) return;
  const ev = {
    fecha: new Date().toLocaleString("sv-SE"), // AAAA-MM-DD hh:mm:ss
    equipo: equipo.nombre,
    integrantes: equipo.integrantes.join(", "),
    regionId: region ? region.id : "",
    region: region ? region.nombre : "",
    accion,
    recurso,
  };
  const reg = almacen.get("registro", []);
  reg.push(ev);
  almacen.set("registro", reg);
  if (APPS_SCRIPT_URL) {
    const cola = almacen.get("cola", []);
    cola.push(ev);
    almacen.set("cola", cola);
    enviarCola();
  }
}

let enviando = false;
async function enviarCola() {
  if (!APPS_SCRIPT_URL || enviando || !navigator.onLine) return;
  const lote = almacen.get("cola", []);
  if (!lote.length) return;
  enviando = true;
  let ok = false;
  try {
    // "no-cors" + text/plain evita la petición previa CORS que Apps Script no admite.
    // ponytail: la respuesta es opaca; solo detectamos fallos de red, no errores del script.
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(lote),
    });
    almacen.set("cola", almacen.get("cola", []).slice(lote.length));
    ok = true;
  } catch { /* sin conexión: se reintenta más tarde */ }
  enviando = false;
  if (ok && almacen.get("cola", []).length) enviarCola();
}
addEventListener("online", enviarCola);
setInterval(enviarCola, 60_000);

/* =========================================================
   EQUIPO
   ========================================================= */
const dlgEquipo = $("#dlgEquipo");

function filaMiembro(valor = "") {
  const n = $("#eqMiembros").children.length + 1;
  const fila = h("div", { class: "eq-fila" },
    h("input", { type: "text", maxlength: 40, autocomplete: "off", value: valor, "aria-label": `Integrante ${n}` }),
    h("button", { type: "button", class: "btn-icono", "aria-label": `Quitar integrante ${n}`, onclick: () => { fila.remove(); actualizarMiembros(); } },
      svgIcono('<path d="M6 6l12 12M18 6L6 18"/>')));
  return fila;
}
function actualizarMiembros() {
  const filas = [...$("#eqMiembros").children];
  filas.forEach((f, i) => {
    f.querySelector("input").setAttribute("aria-label", `Integrante ${i + 1}`);
    const b = f.querySelector("button");
    b.setAttribute("aria-label", `Quitar integrante ${i + 1}`);
    b.hidden = filas.length <= 2;
  });
  $("#eqAnadir").hidden = filas.length >= 4;
}

function abrirEquipo() {
  $("#eqNombre").value = "";
  $("#eqMiembros").replaceChildren(filaMiembro(), filaMiembro(), filaMiembro());
  $("#eqError").textContent = "";
  $("#eqCancelar").hidden = !equipo;
  actualizarMiembros();
  dlgEquipo.showModal();
  $("#eqNombre").focus();
}
$("#eqAnadir").addEventListener("click", () => {
  const fila = filaMiembro();
  $("#eqMiembros").append(fila);
  actualizarMiembros();
  fila.querySelector("input").focus();
});
$("#eqCancelar").addEventListener("click", () => dlgEquipo.close());
dlgEquipo.addEventListener("cancel", e => { if (!equipo) e.preventDefault(); });

$("#formEquipo").addEventListener("submit", e => {
  e.preventDefault();
  const nombre = $("#eqNombre").value.trim();
  const inputs = [...$("#eqMiembros").querySelectorAll("input")];
  const integrantes = inputs.map(i => i.value.trim());
  if (!nombre) { $("#eqError").textContent = "Escribid el nombre del equipo."; $("#eqNombre").focus(); return; }
  const vacio = inputs.find(i => !i.value.trim());
  if (vacio) { $("#eqError").textContent = "Escribid el nombre de cada integrante o quitad la casilla vacía."; vacio.focus(); return; }
  equipo = { nombre, integrantes };
  almacen.set("equipo", equipo);
  dlgEquipo.close();
  aplicarEquipo();
  registrar("Inicio de sesión", null);
});

function aplicarEquipo() {
  $("#equipoNombre").textContent = equipo ? equipo.nombre : "";
  $("#equipoNombre").title = equipo ? equipo.integrantes.join(", ") : "";
  vistas = equipo ? vistasDe(equipo.nombre) : new Set();
  actualizarProgreso();
  if (seleccion) pintarPanel(porId.get(seleccion));
}
$("#cambiarEquipo").addEventListener("click", abrirEquipo);

function marcarVista(id, si) {
  const todas = almacen.get("vistas", {});
  const s = new Set(todas[equipo.nombre] || []);
  si ? s.add(id) : s.delete(id);
  todas[equipo.nombre] = [...s];
  almacen.set("vistas", todas);
  vistas = s;
  actualizarProgreso();
}

function actualizarProgreso() {
  const total = REGIONES.length, n = REGIONES.filter(r => vistas.has(r.id)).length;
  const txt = $("#progresoTexto");
  txt.replaceChildren(h("span", { class: "largo" }, "Habéis explorado "), h("strong", {}, `${n} de ${total}`), h("span", { class: "largo" }, " regiones"));
  $("#progresoRelleno").style.width = total ? `${(100 * n) / total}%` : "0";
  document.querySelectorAll(".item").forEach(b => {
    const v = vistas.has(b.dataset.id);
    b.querySelector(".check").hidden = !v;
    b.setAttribute("aria-label", b.dataset.nombre + (v ? " (vista)" : ""));
  });
  mapa?.refrescar();
}

/* =========================================================
   LISTA DE REGIONES
   ========================================================= */
const ORDEN_GRUPOS = ["España", "América del Norte", "Centroamérica", "Caribe", "América del Sur", "África", "Asia"];
const TITULO_GRUPO = { "España": "Europa · España" };

function pintarLista() {
  const grupos = [...new Set([...ORDEN_GRUPOS, ...REGIONES.map(r => r.grupo)])];
  const cont = $("#listaGrupos");
  cont.replaceChildren(...grupos.flatMap(g => {
    const rs = REGIONES.filter(r => r.grupo === g);
    if (!rs.length) return [];
    return [
      h("h3", {}, TITULO_GRUPO[g] || g),
      h("ul", {}, rs.map(r => h("li", {},
        h("button", {
          type: "button", class: "item", "data-id": r.id, "data-nombre": r.nombre,
          onclick: () => { seleccionar(r.id); if (!esAncho()) cerrarLista(); },
          onmouseenter: () => mapa?.resaltar(r.id, true),
          onmouseleave: () => mapa?.resaltar(r.id, false),
        },
        h("span", { class: "muestra", style: `background:${r.color}`, "aria-hidden": "true" }),
        h("span", { class: "nombre" }, r.nombre),
        h("span", { class: "check", "aria-hidden": "true", hidden: true }, "✓"))))),
    ];
  }));
  // Flechas arriba/abajo para moverse por la lista
  cont.addEventListener("keydown", e => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const items = [...cont.querySelectorAll(".item")];
    const i = items.indexOf(document.activeElement);
    const j = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1
      : Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)));
    items[j]?.focus();
    e.preventDefault();
  });
}

function abrirLista() {
  document.body.classList.add("lista-abierta");
  $("#abrirLista").setAttribute("aria-expanded", "true");
  $("#lista").removeAttribute("inert");
}
function cerrarLista() {
  document.body.classList.remove("lista-abierta");
  $("#abrirLista").setAttribute("aria-expanded", "false");
  $("#lista").setAttribute("inert", "");
}
$("#abrirLista").addEventListener("click", () => { abrirLista(); $("#listaGrupos .item")?.focus(); });
$("#cerrarLista").addEventListener("click", () => { cerrarLista(); $("#abrirLista").focus(); });
$(".saltar").addEventListener("click", () => abrirLista());

/* =========================================================
   MAPA
   ========================================================= */
let mapa = null;

function crearMapa(mundo, espana, relieve) {
  const svg = d3.select("#svg");
  const contenedor = $("#mapa");
  const tooltip = $("#tooltip");
  const defs = svg.append("defs");
  const gMapa = svg.append("g");
  const gEsfera = gMapa.append("g");
  const gPaises = gMapa.append("g");
  const gRecuadro = gMapa.append("g");
  const gEs = gMapa.append("g");
  const gRelieve = gMapa.append("g");
  const gEtiquetas = svg.append("g");
  const gMarcadores = svg.append("g");
  void defs;

  const paises = topojson.feature(mundo, mundo.objects.countries).features
    .filter(f => f.geometry)
    // los países hispanohablantes se dibujan encima para que su borde marcado se vea entero
    .sort((a, b) => (porId.has(a.properties.r) ? 1 : 0) - (porId.has(b.properties.r) ? 1 : 0));
  const regionesEs = espana.features;
  const recuadro = regionesEs.find(f => f.properties.recuadro);
  const lineas = relieve.features.filter(f => f.geometry.type === "LineString");
  const picos = relieve.features.filter(f => f.properties.pico);
  // El Teide también aparece dentro del recuadro de Canarias (mismo desplazamiento que el recuadro)
  const DESPL = [4.6, 7.1];

  const proyeccion = d3.geoEqualEarth();
  const camino = d3.geoPath(proyeccion);
  let ancho = 0, alto = 0, T = d3.zoomIdentity;

  // Polígono más grande de un rasgo (para etiquetas y encuadres: evita Alaska, Galápagos, etc.)
  const mayorPoligono = f => {
    if (f.geometry.type !== "MultiPolygon") return f;
    let mejor = null, area = -1;
    for (const c of f.geometry.coordinates) {
      const p = { type: "Polygon", coordinates: c }, a = d3.geoArea(p);
      if (a > area) { area = a; mejor = p; }
    }
    return { type: "Feature", geometry: mejor };
  };

  // Medición de texto para colocar etiquetas sin solaparse
  const ctx = document.createElement("canvas").getContext("2d");
  const medir = (texto, px, peso = 400) => { ctx.font = `${peso} ${px}px ${getComputedStyle(document.body).fontFamily}`; return ctx.measureText(texto).width; };
  // ponytail: medimos una vez por dibujado; si la fuente web llega tarde, se vuelve a dibujar sin zoom

  /* --- Etiquetas --- */
  const etiquetas = [];
  for (const f of paises) {
    const r = porId.get(f.properties.r);
    const nombre = r ? r.nombre : f.properties.n;
    if (!nombre) continue;
    etiquetas.push({ tipo: r || f.properties.r === "es" ? "hisp" : "pais", id: f.properties.r, texto: nombre, geo: mayorPoligono(f), espana: f.properties.r === "es" });
  }
  for (const f of regionesEs) {
    const r = porId.get(f.properties.r);
    if (!r) continue;
    // El canario se etiqueta en el recuadro; las islas reales llevan su nombre al acercarse
    etiquetas.push({ tipo: "es", id: r.id, texto: r.etiqueta || r.nombre, geo: f.properties.recuadro ? f : mayorPoligono(f), recuadro: !!f.properties.recuadro });
  }
  for (const f of lineas) {
    const c = f.geometry.coordinates;
    etiquetas.push({ tipo: "relieve", texto: f.properties.nombre, zmin: f.properties.zmin, punto: c[Math.floor(c.length / 2)], desfase: -14 });
  }
  for (const f of picos) {
    const [x, y] = f.geometry.coordinates;
    etiquetas.push({ tipo: "relieve", texto: f.properties.nombre, zmin: f.properties.zmin, punto: [x, y], desfase: -14 });
    etiquetas.push({ tipo: "relieve", texto: f.properties.nombre, zmin: ZOOM_REGIONES_ES, punto: [x + DESPL[0], y + DESPL[1]], desfase: -14 });
  }
  const PRIORIDAD = { es: 0, hisp: 1, relieve: 2, pais: 3 };

  let textos = gEtiquetas.selectAll("text").data(etiquetas).join("text")
    .attr("class", d => `etiqueta e-${d.tipo} oculta`);

  /* --- Marcadores para regiones pequeñas --- */
  const PEQUENAS = { pr: 6, gq: 6, ph: 3 }; // id → zoom máximo en que se ve el punto
  const marcadores = paises.filter(f => PEQUENAS[f.properties.r]).map(f => ({ id: f.properties.r, geo: mayorPoligono(f), kmax: PEQUENAS[f.properties.r] }));
  const gm = gMarcadores.selectAll("g").data(marcadores).join("g")
    .attr("class", "marcador")
    .on("click", (e, d) => seleccionar(d.id))
    .on("pointerenter", (e, d) => mostrarTooltip(e, d.id))
    .on("pointermove", (e, d) => mostrarTooltip(e, d.id))
    .on("pointerleave", ocultarTooltip);
  gm.append("circle").attr("class", "halo").attr("r", 11);
  gm.append("circle").attr("class", "punto").attr("r", 6).attr("fill", d => porId.get(d.id).color);
  gm.append("circle").attr("class", "toque").attr("r", 24); // área de toque amplia

  /* --- Dibujo --- */
  const esfera = gEsfera.append("path").attr("class", "esfera");
  const reticula = gEsfera.append("path").attr("class", "reticula");
  const rutas = gPaises.selectAll("path").data(paises).join("path")
    .attr("class", d => {
      const r = d.properties.r;
      return "pais" + (porId.has(r) ? " hisp" : "") + (r === "es" ? " es hisp" : "");
    })
    .attr("data-id", d => d.properties.r || null)
    .style("fill", d => porId.get(d.properties.r)?.color || (d.properties.r === "es" ? "#E8A27C" : null));
  const rutasEs = gEs.selectAll("path").data(regionesEs).join("path")
    .attr("class", "region-es hisp")
    .attr("data-id", d => d.properties.r)
    .style("fill", d => porId.get(d.properties.r)?.color);
  const marco = gRecuadro.append("rect").attr("class", "recuadro").attr("rx", 4);
  const bandas = gRelieve.selectAll("path.relieve-banda").data(lineas).join("path").attr("class", "relieve-banda");
  const crestas = gRelieve.selectAll("path.relieve-cresta").data(lineas).join("path").attr("class", "relieve-cresta");
  const triangulos = gRelieve.selectAll("path.pico").data(picos.flatMap(f => {
    const [x, y] = f.geometry.coordinates;
    return [{ c: [x, y], zmin: f.properties.zmin }, { c: [x + DESPL[0], y + DESPL[1]], zmin: ZOOM_REGIONES_ES }];
  })).join("path").attr("class", "pico");

  // Eventos sobre las zonas seleccionables
  svg.selectAll(".hisp")
    .on("click", (e, d) => {
      const id = d.properties.r;
      if (id === "es" && !d.properties.recuadro && !porId.has(id)) return zoomA(limitesEspana(), 9, ZOOM_REGIONES_ES + 1.2);
      seleccionar(id);
    })
    .on("pointerenter", (e, d) => { e.currentTarget.classList.add("hover"); mostrarTooltip(e, d.properties.r); })
    .on("pointermove", (e, d) => mostrarTooltip(e, d.properties.r))
    .on("pointerleave", e => { e.currentTarget.classList.remove("hover"); ocultarTooltip(); });

  function mostrarTooltip(e, id) {
    if (e.pointerType === "touch") return;
    const r = porId.get(id);
    tooltip.textContent = r ? r.nombre + (vistas.has(id) ? " ✓" : "") : "España · acércate para ver sus regiones";
    const caja = contenedor.getBoundingClientRect();
    tooltip.style.left = `${e.clientX - caja.left}px`;
    tooltip.style.top = `${e.clientY - caja.top}px`;
    tooltip.hidden = false;
  }
  function ocultarTooltip() { tooltip.hidden = true; }

  function dibujar() {
    ancho = contenedor.clientWidth;
    alto = contenedor.clientHeight;
    if (!ancho || !alto) return;
    svg.attr("viewBox", `0 0 ${ancho} ${alto}`);
    const margen = Math.min(ancho, alto) * 0.04;
    proyeccion.fitExtent([[margen, margen], [ancho - margen, alto - margen]], { type: "FeatureCollection", features: paises });
    esfera.attr("d", camino({ type: "Sphere" }));
    reticula.attr("d", camino(d3.geoGraticule10()));
    rutas.attr("d", camino);
    rutasEs.attr("d", camino);
    const [[x0, y0], [x1, y1]] = camino.bounds(recuadro), p = 4;
    marco.attr("x", x0 - p).attr("y", y0 - p).attr("width", x1 - x0 + 2 * p).attr("height", y1 - y0 + 2 * p);
    const gradoPx = proyeccion.scale() * Math.PI / 180;
    bandas.attr("d", camino).attr("stroke-width", d => d.properties.ancho * gradoPx);
    crestas.attr("d", camino);
    triangulos.attr("d", d => { const [x, y] = proyeccion(d.c), s = 0.9 * gradoPx * 0.25; return `M${x},${y - s}L${x + s},${y + s * 0.7}L${x - s},${y + s * 0.7}Z`; });

    for (const L of etiquetas) {
      if (L.geo) {
        L.xy = camino.centroid(L.geo);
        const [[a, b], [c, d]] = camino.bounds(L.geo);
        // Países alargados (Chile): si el centroide cae fuera, buscamos el punto interior más cercano
        const dentro = p => { const g = proyeccion.invert(p); return g && d3.geoContains(L.geo, g); };
        if (!L.recuadro && !dentro(L.xy)) {
          let mejor = null, dist = Infinity;
          for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) {
            const p = [a + ((c - a) * i) / 24, b + ((d - b) * j) / 24], q = (p[0] - L.xy[0]) ** 2 + (p[1] - L.xy[1]) ** 2;
            if (q < dist && dentro(p)) { mejor = p; dist = q; }
          }
          if (mejor) L.xy = mejor;
        }
        L.anchoGeo = c - a; L.altoGeo = d - b; L.caja = [[a, b], [c, d]];
      } else {
        L.xy = proyeccion(L.punto);
      }
      const px = L.tipo === "pais" ? 11 : L.tipo === "relieve" ? 11 : L.tipo === "es" ? 12 : 13;
      L.px = esAncho() && innerWidth >= 1600 ? px + 2 : px;
      L.w = medir(L.texto + " ✓", L.px, L.tipo === "hisp" || L.tipo === "es" ? 700 : 400);
    }
    textos = textos.sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo] || (b.anchoGeo || 0) - (a.anchoGeo || 0));
    for (const m of marcadores) m.xy = camino.centroid(m.geo);

    zoom.extent([[0, 0], [ancho, alto]]).translateExtent([[-ancho * 0.2, -alto * 0.2], [ancho * 1.2, alto * 1.2]]);
    svg.call(zoom.transform, d3.zoomIdentity);
  }

  /* --- Overlay de etiquetas y marcadores (tamaño constante en pantalla) --- */
  let pendiente = false;
  function programar() { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; actualizarOverlay(); }); } }

  function actualizarOverlay() {
    const k = T.k, verEs = k >= ZOOM_REGIONES_ES, colocadas = [];
    const solapa = (x0, y0, x1, y1) => colocadas.some(c => x0 < c[2] && x1 > c[0] && y0 < c[3] && y1 > c[1]);
    textos.each(function (L) {
      let mostrar;
      if (L.tipo === "es") mostrar = verEs && L.anchoGeo * k > L.w * 0.55;
      else if (L.tipo === "relieve") mostrar = k >= L.zmin && (L.zmin !== ZOOM_REGIONES_ES || verEs);
      else if (L.espana) mostrar = !verEs && L.anchoGeo * k > L.w * 0.6;
      else if (L.tipo === "hisp") mostrar = L.anchoGeo * k > L.w * 0.6 || (L.anchoGeo * k > L.w * 0.3 && k > 2);
      else mostrar = L.anchoGeo * k > L.w * 1.05 && L.altoGeo * k > L.px;
      let x = T.applyX(L.xy[0]), y = T.applyY(L.xy[1]) + (L.desfase || 0);
      if (mostrar) {
        mostrar = x > -50 && x < ancho + 50 && y > -20 && y < alto + 20;
      }
      const vista = L.id && vistas.has(L.id);
      const texto = L.texto + (vista ? " ✓" : "");
      const w = L.w, hgt = L.px * 1.3;
      if (mostrar && solapa(x - w / 2, y - hgt / 2, x + w / 2, y + hgt / 2)) mostrar = false;
      if (mostrar) colocadas.push([x - w / 2 - 2, y - hgt / 2, x + w / 2 + 2, y + hgt / 2]);
      this.classList.toggle("oculta", !mostrar);
      if (mostrar) {
        this.setAttribute("x", x.toFixed(1));
        this.setAttribute("y", y.toFixed(1));
        this.style.fontSize = L.px + "px";
        if (this.textContent !== texto) this.textContent = texto;
      }
    });
    gm.attr("transform", d => `translate(${T.applyX(d.xy[0])},${T.applyY(d.xy[1])})`)
      .attr("display", d => (k <= d.kmax ? null : "none"));
    crestas.classed("lejos", d => k < d.properties.zmin * 0.6);
    triangulos.attr("display", d => (k >= d.zmin ? null : "none"));
  }

  /* --- Zoom --- */
  const zoom = d3.zoom()
    .scaleExtent([1, 60])
    .on("zoom", e => {
      T = e.transform;
      gMapa.attr("transform", T);
      svg.classed("ver-es", T.k >= ZOOM_REGIONES_ES);
      ocultarTooltip();
      programar();
      if (e.sourceEvent) $("#leyenda").classList.add("desvanecida");
    });
  svg.call(zoom).on("dblclick.zoom", null);

  // Zona del mapa que no tapa la lista
  function margenes() {
    const m = { l: 0, r: 0, t: 0, b: 0 };
    if (document.body.classList.contains("lista-abierta") && !esAncho() && !esMovil()) m.l = $("#lista").offsetWidth;
    return m;
  }

  function zoomA([[x0, y0], [x1, y1]], kmax = 12, kmin = 1) {
    const m = margenes();
    const W = Math.max(80, ancho - m.l - m.r), H = Math.max(80, alto - m.t - m.b);
    let k = 0.8 / Math.max((x1 - x0) / W, (y1 - y0) / H);
    k = Math.max(kmin, Math.min(kmax, k));
    const t = d3.zoomIdentity
      .translate(m.l + W / 2 - (k * (x0 + x1)) / 2, m.t + H / 2 - (k * (y0 + y1)) / 2)
      .scale(k);
    svg.transition().duration(dur(750)).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }
  function limitesEspana() {
    const fc = { type: "FeatureCollection", features: regionesEs.filter(f => !["es-canario"].includes(f.id)) };
    return camino.bounds(fc);
  }
  function limitesDe(id) {
    if (id === "es-canario") return camino.bounds(recuadro);
    const fs = regionesEs.filter(f => f.id === id);
    if (fs.length) return camino.bounds(fs[0]);
    const p = paises.find(f => f.properties.r === id);
    return camino.bounds(mayorPoligono(p));
  }

  // Teclado sobre el mapa
  $("#svg").addEventListener("keydown", e => {
    const paso = 80;
    const acciones = {
      "+": () => svg.transition().duration(dur(250)).call(zoom.scaleBy, 1.5),
      "=": () => svg.transition().duration(dur(250)).call(zoom.scaleBy, 1.5),
      "-": () => svg.transition().duration(dur(250)).call(zoom.scaleBy, 1 / 1.5),
      "0": () => mundoCompleto(),
      ArrowLeft: () => svg.call(zoom.translateBy, paso / T.k, 0),
      ArrowRight: () => svg.call(zoom.translateBy, -paso / T.k, 0),
      ArrowUp: () => svg.call(zoom.translateBy, 0, paso / T.k),
      ArrowDown: () => svg.call(zoom.translateBy, 0, -paso / T.k),
    };
    if (acciones[e.key]) { acciones[e.key](); e.preventDefault(); }
  });

  function mundoCompleto() { svg.transition().duration(dur(750)).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity); }
  $("#zoomMas").addEventListener("click", () => svg.transition().duration(dur(300)).call(zoom.scaleBy, 1.6));
  $("#zoomMenos").addEventListener("click", () => svg.transition().duration(dur(300)).call(zoom.scaleBy, 1 / 1.6));
  $("#zoomMundo").addEventListener("click", () => { cerrarPanel(); mundoCompleto(); });

  let anchoPrevio = 0, altoPrevio = 0, temporizador;
  new ResizeObserver(() => {
    if (contenedor.clientWidth === anchoPrevio && contenedor.clientHeight === altoPrevio) return;
    anchoPrevio = contenedor.clientWidth; altoPrevio = contenedor.clientHeight;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { dibujar(); if (seleccion) zoomA(limitesDe(seleccion), 12, porId.get(seleccion).grupo === "España" ? ZOOM_REGIONES_ES + 0.3 : 1); }, 120);
  }).observe(contenedor);

  dibujar();
  document.fonts?.ready.then(() => { if (T.k === 1) dibujar(); });
  $("#avisoCarga").remove();

  return {
    seleccionar(id) {
      svg.selectAll(".hisp").classed("sel", d => d.properties.r === id);
      svg.selectAll(".hisp.sel").raise();
      gm.classed("sel", d => d.id === id);
      const r = porId.get(id);
      requestAnimationFrame(() => zoomA(limitesDe(id), 12, r.grupo === "España" ? ZOOM_REGIONES_ES + 0.3 : 1));
    },
    deseleccionar() {
      svg.selectAll(".hisp").classed("sel", false);
      gm.classed("sel", false);
    },
    resaltar(id, si) {
      svg.selectAll(".hisp").filter(d => d.properties.r === id).classed("hover", si);
    },
    refrescar: programar,
  };
}

/* =========================================================
   SELECCIÓN Y VENTANA DE REGIÓN
   ========================================================= */
const dlgRegion = $("#dlgRegion");

function seleccionar(id) {
  const r = porId.get(id);
  if (!r) return;
  seleccion = id;
  document.querySelectorAll(".item").forEach(b => b.setAttribute("aria-current", b.dataset.id === id ? "true" : "false"));
  pintarPanel(r);
  if (!dlgRegion.open) dlgRegion.showModal();
  $("#panelCuerpo").scrollTop = 0;
  $("#panelTitulo").focus({ preventScroll: true });
  $("#leyenda").classList.add("desvanecida");
  mapa.seleccionar(id);
  registrar("Abrir región", r);
  iniciarReloj();
}

function cerrarPanel() { if (dlgRegion.open) dlgRegion.close(); }
dlgRegion.addEventListener("close", () => {
  seleccion = null;
  clearInterval(reloj);
  document.querySelectorAll(".item[aria-current]").forEach(b => b.setAttribute("aria-current", "false"));
  mapa.deseleccionar();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !document.querySelector("dialog[open]") && document.body.classList.contains("lista-abierta") && !esAncho()) {
    cerrarLista(); $("#abrirLista").focus();
  }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); pedirPin(); }
});

/* --- Marcado automático: la región cuenta como vista tras tenerla abierta SEGUNDOS_VISTA seguidos --- */
let reloj = null, segundos = 0;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function iniciarReloj() {
  clearInterval(reloj);
  segundos = 0;
  pintarReloj();
  reloj = setInterval(() => {
    if (document.hidden || !seleccion) return; // con la pestaña oculta no cuenta
    segundos++;
    if (segundos >= SEGUNDOS_VISTA && equipo && !vistas.has(seleccion)) {
      const r = porId.get(seleccion);
      marcarVista(r.id, true);
      registrar("Marcar como vista", r, `Automático (${mmss(SEGUNDOS_VISTA)} abierta)`);
    }
    pintarReloj();
  }, 1000);
}

function pintarReloj() {
  const pie = $("#estadoVista");
  if (!seleccion) return;
  if (vistas.has(seleccion)) {
    pie.replaceChildren(h("span", { class: "p-vista" }, "✓ Región explorada"));
    clearInterval(reloj);
    return;
  }
  const falta = Math.max(0, SEGUNDOS_VISTA - segundos);
  pie.replaceChildren(
    h("span", { class: "reloj-texto" }, "Se marcará como explorada en ", h("strong", {}, mmss(falta))),
    h("span", { class: "reloj-barra", "aria-hidden": "true" }, h("span", { style: `width:${(100 * segundos) / SEGUNDOS_VISTA}%` })));
  pie.setAttribute("aria-live", falta % 60 === 0 ? "polite" : "off"); // no anunciar cada segundo
}

// Windows no muestra banderas emoji: usamos el SVG equivalente (flag-icons, MIT)
function bandera(r, clase = "p-bandera") {
  const cod = [...(r.bandera || "")].map(c => String.fromCharCode(c.codePointAt(0) - 127397)).join("").toLowerCase();
  if (!/^[a-z]{2}$/.test(cod)) return null;
  return h("img", { class: clase, src: `https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/${cod}.svg`, alt: "", width: 48, height: 36 });
}

function pintarPanel(r) {
  dlgRegion.style.setProperty("--color-region", r.color);
  $("#panelCuerpo").replaceChildren(...[
    h("header", { class: "p-cab" },
      bandera(r),
      h("div", {},
        h("h2", { id: "panelTitulo", tabindex: "-1" }, r.nombre),
        r.zona ? h("p", { class: "p-zona" }, r.zona) : null)),
    r.intro ? h("p", { class: "p-intro" }, r.intro) : null,
    h("section", { class: "p-seccion", "aria-labelledby": "secRecursos" },
      h("h3", { id: "secRecursos" }, "Recursos"),
      r.recursos?.length
        ? h("div", { class: "recursos" }, r.recursos.map(rec => tarjetaRecurso(rec, r)))
        : h("div", { class: "p-vacio" },
          h("p", {}, "Todavía no hay vídeos, audios ni enlaces para esta región."),
          h("p", {}, "Pronto los añadiremos. ¡Mientras tanto, seguid explorando el mapa!"))),
  ].filter(Boolean));
  pintarReloj();
}

/* =========================================================
   RECURSOS
   ========================================================= */
const TIPOS = { youtube: "Vídeo", vimeo: "Vídeo", audio: "Audio", archivo: "Archivo", libro: "Lectura", web: "Página web" };
const esImagen = u => /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(u);
const esPdf = u => /\.pdf(\?|#|$)/i.test(u);
const esPendiente = rec => !rec.url || rec.url === "PENDIENTE";
const urlSegura = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };

function idYoutube(u) {
  try {
    const x = new URL(u);
    if (x.hostname.endsWith("youtu.be")) return x.pathname.slice(1).split("/")[0];
    if (x.searchParams.get("v")) return x.searchParams.get("v");
    const m = x.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/);
    return m ? m[2] : null;
  } catch { return null; }
}
function idVimeo(u) { const m = String(u).match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? m[1] : null; }

function tarjetaRecurso(rec, region) {
  const tipo = TIPOS[rec.tipo] || "Recurso";
  const cab = [
    h("span", { class: "tarjeta-tipo" }, tipo),
    h("h4", {}, rec.titulo),
    rec.descripcion ? h("p", {}, rec.descripcion) : null,
    rec.fuente ? h("p", { class: "fuente" }, "Fuente: ", rec.fuente) : null,
  ];

  if (rec.tipo === "libro") {
    return h("article", { class: "tarjeta" }, h("div", { class: "tarjeta-cuerpo" },
      h("span", { class: "tarjeta-tipo" }, tipo),
      h("h4", {}, rec.titulo),
      rec.descripcion ? h("p", {}, rec.descripcion) : null,
      h("blockquote", { class: "lectura" },
        h("p", {}, rec.texto || ""),
        h("footer", {}, [rec.autor, rec.obra && `«${rec.obra}»`, rec.anio && `(${rec.anio})`].filter(Boolean).join(", ").replace(", (", " ("))),
      h("button", { type: "button", class: "btn", onclick: () => abrirMedia(rec, region) }, "Leer en grande")));
  }

  if (esPendiente(rec) || !urlSegura(rec.url)) {
    return h("article", { class: "tarjeta pendiente" }, h("div", { class: "tarjeta-cuerpo" }, cab,
      h("span", { class: "etiqueta-pendiente" }, "Próximamente")));
  }

  if (rec.tipo === "youtube" && idYoutube(rec.url)) {
    const id = idYoutube(rec.url);
    return h("article", { class: "tarjeta" },
      h("button", {
        type: "button", class: "miniatura", "aria-label": `Ver el vídeo: ${rec.titulo}`,
        style: `background-image:url("https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg")`,
        onclick: () => abrirMedia(rec, region),
      }),
      h("div", { class: "tarjeta-cuerpo" }, cab));
  }

  const accion = { vimeo: "Ver el vídeo", audio: "Escuchar", web: "Ver la página", archivo: "Abrir el archivo" }[rec.tipo] || "Abrir";
  return h("article", { class: "tarjeta" }, h("div", { class: "tarjeta-cuerpo" }, cab,
    h("button", { type: "button", class: "btn btn-primario", onclick: () => abrirMedia(rec, region) },
      rec.tipo === "audio" || rec.tipo === "vimeo" ? svgIcono('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>') : null,
      accion)));
}

const dlgMedia = $("#dlgMedia");
dlgMedia.addEventListener("close", () => $("#mediaCuerpo").replaceChildren()); // detiene vídeo y audio
document.querySelectorAll("[data-cerrar]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => {
  if (e.target === d && d !== dlgEquipo) d.close(); // clic en el fondo
}));

function abrirMedia(rec, region) {
  $("#mediaTitulo").textContent = rec.titulo;
  const cuerpo = $("#mediaCuerpo");
  const url = urlSegura(rec.url);
  let contenido;

  if (rec.tipo === "youtube") {
    contenido = h("div", { class: "video" }, h("iframe", {
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(idYoutube(rec.url))}?autoplay=1&rel=0`,
      title: rec.titulo, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen", allowfullscreen: true,
      referrerpolicy: "strict-origin-when-cross-origin",
    }));
  } else if (rec.tipo === "vimeo") {
    const id = idVimeo(rec.url);
    contenido = id
      ? h("div", { class: "video" }, h("iframe", { src: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`, title: rec.titulo, allow: "autoplay; fullscreen; picture-in-picture", allowfullscreen: true }))
      : vistaWeb(rec, url);
  } else if (rec.tipo === "audio") {
    contenido = reproductor(url, rec.titulo);
  } else if (rec.tipo === "archivo" && esImagen(url)) {
    contenido = h("img", { class: "media-imagen", src: url, alt: rec.descripcion || rec.titulo });
  } else if (rec.tipo === "archivo" && esPdf(url)) {
    contenido = h("div", { class: "web" }, h("iframe", { src: url, title: rec.titulo }));
  } else if (rec.tipo === "archivo") {
    contenido = h("div", { class: "p-vacio" }, h("p", {}, rec.descripcion || "Este archivo se abre fuera de la página."),
      h("a", { class: "btn btn-primario", href: url, target: "_blank", rel: "noopener" }, "Abrir o descargar ↗"));
  } else if (rec.tipo === "libro") {
    contenido = h("blockquote", { class: "lectura lectura-grande", style: `--color-region:${region.color}` },
      h("p", {}, rec.texto || ""),
      h("footer", {}, [rec.autor, rec.obra && `«${rec.obra}»`, rec.anio].filter(Boolean).join(" · ")));
  } else {
    contenido = vistaWeb(rec, url);
  }

  cuerpo.replaceChildren(...[contenido,
    rec.fuente && rec.tipo !== "libro" ? h("div", { class: "media-pie" }, h("p", {}, "Fuente: ", rec.fuente),
      url && rec.tipo !== "web" ? h("a", { class: "btn btn-sutil", href: url, target: "_blank", rel: "noopener" }, "Abrir en pestaña nueva ↗") : null) : null].filter(Boolean));
  dlgMedia.showModal();
  registrar("Abrir recurso", region, `${TIPOS[rec.tipo] || rec.tipo}: ${rec.titulo}`);
}

// Muchas webs prohíben mostrarse dentro de otra (X-Frame-Options / CSP). El navegador no
// deja comprobarlo desde aquí, así que siempre ofrecemos el botón y, si no carga, la tarjeta.
function vistaWeb(rec, url) {
  const tarjeta = h("div", { class: "tarjeta" }, h("div", { class: "tarjeta-cuerpo" },
    h("span", { class: "tarjeta-tipo" }, "Página web"),
    h("h4", {}, rec.titulo),
    rec.descripcion ? h("p", {}, rec.descripcion) : null,
    h("p", {}, "Si la vista previa no aparece, es porque esta web no permite mostrarse dentro de otra página."),
    h("a", { class: "btn btn-primario", href: url, target: "_blank", rel: "noopener" }, "Abrir en pestaña nueva ↗")));
  const estado = h("div", { class: "web-estado" }, h("p", {}, "Cargando la vista previa…"));
  const marco = h("iframe", { src: url, title: rec.titulo, loading: "lazy", referrerpolicy: "no-referrer", sandbox: "allow-scripts allow-same-origin allow-popups allow-forms" });
  const t = setTimeout(() => estado.replaceChildren(tarjeta), 8000);
  marco.addEventListener("load", () => { clearTimeout(t); estado.remove(); });
  return h("div", {},
    h("div", { class: "web" }, marco, estado),
    h("div", { class: "media-pie" },
      h("p", {}, "¿Se ve en blanco o con un error? Esta web no deja mostrarse aquí."),
      h("a", { class: "btn btn-primario", href: url, target: "_blank", rel: "noopener" }, "Abrir en pestaña nueva ↗")));
}

function reproductor(url, titulo) {
  const audio = h("audio", { src: url, preload: "metadata" });
  const ico = svgIcono(ICO_PLAY);
  const play = h("button", { type: "button", class: "audio-play", "aria-label": "Reproducir" }, ico);
  const barra = h("input", { type: "range", min: 0, max: 100, step: 0.1, value: 0, "aria-label": `Posición de ${titulo}` });
  const tiempo = h("span", { class: "audio-tiempo" }, "0:00 / 0:00");
  const error = h("p", { class: "audio-error", role: "alert", hidden: true }, "No se ha podido cargar el audio. Comprobad el enlace o la conexión.");
  const mmss = s => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
  const pintar = () => {
    barra.value = audio.duration ? (100 * audio.currentTime) / audio.duration : 0;
    barra.setAttribute("aria-valuetext", mmss(audio.currentTime));
    tiempo.textContent = `${mmss(audio.currentTime)} / ${mmss(audio.duration)}`;
  };
  play.addEventListener("click", () => (audio.paused ? audio.play().catch(() => (error.hidden = false)) : audio.pause()));
  audio.addEventListener("play", () => { ico.innerHTML = ICO_PAUSA; play.setAttribute("aria-label", "Pausar"); });
  audio.addEventListener("pause", () => { ico.innerHTML = ICO_PLAY; play.setAttribute("aria-label", "Reproducir"); });
  audio.addEventListener("timeupdate", pintar);
  audio.addEventListener("loadedmetadata", pintar);
  audio.addEventListener("error", () => (error.hidden = false));
  barra.addEventListener("input", () => { if (audio.duration) audio.currentTime = (barra.value / 100) * audio.duration; });
  return h("div", {}, h("div", { class: "audio" }, audio, play, h("div", { class: "audio-pista" }, barra, tiempo)), error);
}

/* =========================================================
   CURIOSIDADES
   ========================================================= */
const dlgCur = $("#dlgCuriosidades");
let curiosidades = null;

$("#abrirCuriosidades").addEventListener("click", async () => {
  dlgCur.showModal();
  registrar("Abrir curiosidades", null);
  if (curiosidades) return;
  $("#curCuerpo").replaceChildren(h("p", { class: "p-vacio" }, "Cargando…"));
  try {
    curiosidades = await fetch("data/curiosidades.json").then(r => { if (!r.ok) throw 0; return r.json(); });
  } catch {
    $("#curCuerpo").replaceChildren(h("p", { class: "p-vacio" }, "No se han podido cargar las curiosidades. Revisad la conexión."));
    return;
  }
  $("#curCuerpo").replaceChildren(h("div", { class: "cur-rejilla" }, curiosidades.map(c =>
    h("article", { class: "cur-tarjeta", style: `--color-region:${porId.get(c.id)?.color || "#E8A27C"}` },
      h("header", {}, bandera(c, "cur-bandera"), h("div", {}, h("h4", {}, c.nombre), h("span", { class: "cur-zona" }, c.grupo))),
      h("ul", {}, c.curiosidades.map(t => h("li", {}, t)))))));
});

/* =========================================================
   PANEL DEL PROFESOR
   ========================================================= */
let toques = [];
$("#logo").addEventListener("click", () => {
  const ahora = Date.now();
  toques = [...toques.filter(t => ahora - t < 2500), ahora];
  if (toques.length >= 5) { toques = []; pedirPin(); }
});

function pedirPin() {
  $("#pinInput").value = "";
  $("#pinError").textContent = "";
  $("#dlgPin").showModal();
}
$("#formPin").addEventListener("submit", e => {
  e.preventDefault();
  if ($("#pinInput").value !== PIN_PROFESOR) { $("#pinError").textContent = "PIN incorrecto."; $("#pinInput").select(); return; }
  $("#dlgPin").close();
  pintarProfe();
  $("#dlgProfe").showModal();
});

function datosResumen() {
  const registro = almacen.get("registro", []);
  const todasVistas = almacen.get("vistas", {});
  const equipos = [...new Set([...registro.map(e => e.equipo), ...Object.keys(todasVistas)])].filter(Boolean);
  const abiertas = new Set(registro.filter(e => e.accion === "Abrir región").map(e => e.equipo + "|" + e.regionId));
  const celda = (eq, id) => (todasVistas[eq] || []).includes(id) ? "vista" : abiertas.has(eq + "|" + id) ? "abierta" : "";
  return { registro, equipos, celda };
}

function pintarProfe() {
  const { registro, equipos, celda } = datosResumen();
  const cola = almacen.get("cola", []).length;
  $("#profeEstado").textContent =
    `${registro.length} eventos guardados en este dispositivo. ` +
    (APPS_SCRIPT_URL ? `Envío a Google Sheets activado · ${cola ? cola + " pendientes de enviar" : "todo enviado"}.` : "Envío a Google Sheets sin configurar (ver README).");
  $("#reenviar").hidden = !APPS_SCRIPT_URL;
  if (!equipos.length) { $("#profeTabla").replaceChildren(h("p", { class: "profe-vacio" }, "Todavía no hay actividad registrada.")); return; }
  $("#profeTabla").replaceChildren(h("table", {},
    h("caption", { class: "sr-only" }, "Regiones vistas por cada equipo"),
    h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Región"), equipos.map(eq => h("th", { scope: "col" }, eq)))),
    h("tbody", {}, REGIONES.map(r => h("tr", {},
      h("th", { scope: "row" }, r.nombre),
      equipos.map(eq => {
        const c = celda(eq, r.id);
        return h("td", { class: c === "vista" ? "si" : c === "abierta" ? "abierta" : "" }, c === "vista" ? "✓ vista" : c === "abierta" ? "abierta" : "—");
      })))),
    h("tfoot", {}, h("tr", {}, h("th", { scope: "row" }, "Total vistas"),
      equipos.map(eq => h("td", {}, `${REGIONES.filter(r => celda(eq, r.id) === "vista").length} / ${REGIONES.length}`))))));
}

function descargarCSV(nombre, filas) {
  const esc = v => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const texto = "﻿" + filas.map(f => f.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = h("a", { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const hoy = () => new Date().toLocaleDateString("sv-SE");

$("#exportarEventos").addEventListener("click", () => {
  const { registro } = datosResumen();
  descargarCSV(`cartografia-eventos-${hoy()}.csv`, [
    ["Fecha", "Equipo", "Integrantes", "Región", "Acción", "Recurso"],
    ...registro.map(e => [e.fecha, e.equipo, e.integrantes, e.region, e.accion, e.recurso]),
  ]);
});
$("#exportarResumen").addEventListener("click", () => {
  const { equipos, celda } = datosResumen();
  descargarCSV(`cartografia-resumen-${hoy()}.csv`, [
    ["Región", ...equipos],
    ...REGIONES.map(r => [r.nombre, ...equipos.map(eq => celda(eq, r.id))]),
  ]);
});
$("#reenviar").addEventListener("click", async () => { await enviarCola(); pintarProfe(); });
$("#borrarRegistro").addEventListener("click", () => {
  if (!confirm("Se borrarán todos los eventos y el progreso de todos los equipos en este dispositivo. ¿Continuar?")) return;
  ["registro", "cola", "vistas"].forEach(k => almacen.set(k, k === "vistas" ? {} : []));
  vistas = new Set();
  actualizarProgreso();
  if (seleccion) pintarPanel(porId.get(seleccion));
  pintarProfe();
});

/* =========================================================
   ARRANQUE
   ========================================================= */
async function iniciar() {
  if (!esAncho()) cerrarLista(); else abrirLista();
  if (!equipo) abrirEquipo();
  try {
    const cargar = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
    const [mundo, espana, relieve, regiones] = await Promise.all(
      ["data/mundo.topojson", "data/espana-regiones.geojson", "data/relieve.geojson", "data/regiones.json"].map(cargar));
    REGIONES = regiones;
    REGIONES.forEach(r => porId.set(r.id, r));
    pintarLista();
    aplicarEquipo();
    mapa = crearMapa(mundo, espana, relieve);
    actualizarProgreso();
    enviarCola();
  } catch (err) {
    console.error(err);
    $("#avisoCarga").textContent = location.protocol === "file:"
      ? "Para ver el mapa hay que abrir la página desde un servidor web (mirad el README)."
      : "No se ha podido cargar el mapa. Revisad la conexión y recargad la página.";
  }
}
iniciar();
