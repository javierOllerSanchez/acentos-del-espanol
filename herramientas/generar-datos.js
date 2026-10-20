// Uso: npm i world-atlas@2 es-atlas topojson-client topojson-simplify i18n-iso-countries && node generar-datos.js ../data
// Genera data/mundo.topojson y data/espana-regiones.geojson
const fs = require("fs"), path = require("path");
const topo = require("topojson-client"), simp = require("topojson-simplify");
const iso = require("i18n-iso-countries");
const OUT = process.argv[2];
const dn = new Intl.DisplayNames(["es"], { type: "region" });

// ---------- Mundo ----------
const w = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-50m.json")));
const R = { "032":"ar","068":"bo","152":"cl","170":"co","218":"ec","600":"py","604":"pe","858":"uy","862":"ve",
  "484":"mx","320":"gt","340":"hn","222":"sv","558":"ni","188":"cr","591":"pa","192":"cu","214":"do","630":"pr",
  "226":"gq","608":"ph","840":"us","724":"es" };
const extra = { Somaliland:"Somalilandia", Kosovo:"Kosovo", "N. Cyprus":"Chipre del Norte", "Siachen Glacier":"", "Indian Ocean Ter.":"" };
w.objects.countries.geometries = w.objects.countries.geometries.filter(g => g.id !== "010"); // sin Antártida
for (const g of w.objects.countries.geometries) {
  const a2 = g.id && iso.numericToAlpha2(g.id);
  let n = a2 ? dn.of(a2) : extra[g.properties.name];
  if (n === undefined || n === a2) n = g.properties.name;
  g.properties = { n };
  if (R[g.id]) g.properties.r = R[g.id];
}
let ws = simp.presimplify(w);
ws = simp.simplify(ws, simp.quantile(ws, 0.35));
ws.arcs = ws.arcs.map(a => a.map(p => [p[0], p[1]]));
ws = topo.quantize(ws, 1e5);
fs.writeFileSync(path.join(OUT, "mundo.topojson"), JSON.stringify(ws));

// ---------- España: regiones dialectales por provincias (códigos INE) ----------
const e = JSON.parse(fs.readFileSync(require.resolve("es-atlas/es/provinces.json")));
const G = {
  "es-castellano-norte": ["05","09","24","34","37","40","42","47","49"],
  "es-castellano-centro": ["28","02","13","16","19","45"],
  "es-andaluz-occ": ["21","41","11","14","51"],
  "es-andaluz-or": ["29","18","23","04","52"],
  "es-murciano": ["30"],
  "es-extremeno": ["06","10"],
  "es-canario": ["35","38"],
  "es-catalan": ["08","17","25","43","12","46","03","07"],
  "es-gallego": ["15","27","32","36"],
  "es-euskera": ["01","20","48","31"],
  "es-asturias-cantabria": ["33","39"],
  "es-aragon-rioja": ["22","44","50","26"],
};
const geoms = e.objects.provinces.geometries;
const used = new Set(Object.values(G).flat());
const left = geoms.filter(g => !used.has(g.id)).map(g => g.id + " " + g.properties.name);
if (left.length) console.warn("Provincias sin asignar:", left);
const features = Object.entries(G).map(([id, ids]) => ({
  type: "Feature", id, properties: { r: id },
  geometry: topo.merge(e, geoms.filter(g => ids.includes(g.id))),
}));
// Recuadro de Canarias reubicado junto a la península
const DX = 4.6, DY = 7.1;
const can = features.find(f => f.id === "es-canario");
const mv = c => typeof c[0] === "number" ? [+(c[0] + DX).toFixed(4), +(c[1] + DY).toFixed(4)] : c.map(mv);
features.push({ type: "Feature", id: "es-canario-recuadro", properties: { r: "es-canario", recuadro: true },
  geometry: { type: can.geometry.type, coordinates: mv(can.geometry.coordinates) } });
// Redondeo para aligerar
const rd = c => typeof c[0] === "number" ? [+c[0].toFixed(3), +c[1].toFixed(3)] : c.map(rd);
features.forEach(f => f.geometry.coordinates = rd(f.geometry.coordinates));
fs.writeFileSync(path.join(OUT, "espana-regiones.geojson"), JSON.stringify({ type: "FeatureCollection", features }));
console.log("ok", geoms.length);
