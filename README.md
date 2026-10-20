# Los acentos del español

Mapa interactivo para trabajar las variedades del español en 6.º de Primaria. Los equipos exploran el mapa, eligen una región y encuentran sus rasgos, recursos (vídeos, audios, lecturas, webs) y un minijuego «¿Correcto o incorrecto?».

Sigue el enfoque panhispánico de la RAE y la ASALE: **ningún dialecto es incorrecto**. La página distingue entre **rasgos dialectales**, que son correctos (seseo, ceceo, yeísmo, voseo, aspiración de la /s/, «ustedes» por «vosotros», léxico propio…), y **vulgarismos**, que son incorrectos en cualquier variedad («haiga», «andé», «dijistes», «pa'l» en un texto formal…).

Hecho con HTML, CSS y JavaScript, sin frameworks ni compilación. Usa D3 v7 y topojson-client desde jsDelivr.

```
index.html
styles.css
app.js                        ← configuración al principio (URL de Google, PIN)
data/mundo.topojson           ← países (Natural Earth 1:50m, simplificado)
data/espana-regiones.geojson  ← 12 regiones dialectales de España
data/relieve.geojson          ← cordilleras principales (trazado aproximado)
data/regiones.json            ← CONTENIDO DIDÁCTICO (lo que edita el profesorado)
apps-script/registro.gs       ← Google Apps Script para el registro
herramientas/generar-datos.js ← script que generó los dos primeros archivos de data/
```

---

## 1. Probarlo en tu ordenador

La página carga archivos de `data/`, así que **no funciona con doble clic** (`file://`): necesita un servidor web, aunque sea uno local. En la carpeta del proyecto:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000` en el navegador. (Con Node también vale: `npx serve`.)

## 2. Publicarlo en internet

**GitHub Pages (gratis)**
1. Crea un repositorio en GitHub y sube todos los archivos (la estructura de arriba, con `index.html` en la raíz).
2. En el repositorio: *Settings → Pages*. En «Build and deployment», elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`. Guarda.
3. Al cabo de un minuto aparece arriba la dirección, del tipo `https://tu-usuario.github.io/acentos/`. Esa es la que compartes con el alumnado.

**Netlify (gratis)**
1. Entra en <https://app.netlify.com/drop>.
2. Arrastra la carpeta completa del proyecto a la zona indicada.
3. Netlify te da una dirección pública al momento. Para actualizarla, vuelve a arrastrar la carpeta.

---

## 3. Editar los contenidos (`data/regiones.json`)

Todo el texto está en `data/regiones.json`. Es una lista de regiones, y cada una sigue este esquema:

```json
{
  "id": "ar",                     // no lo cambies: une la región con el mapa
  "nombre": "Argentina",
  "etiqueta": "…",                // opcional: nombre corto para el mapa
  "zona": "…",                    // opcional: subtítulo (p. ej. «Sevilla, Cádiz…»)
  "grupo": "América del Sur",     // agrupa la lista lateral
  "bandera": "🇦🇷",               // emoji; se muestra como bandera SVG
  "color": "#93B5E3",             // color en el mapa
  "intro": "Frase de presentación.",
  "rasgos": {
    "pronunciacion": ["…"],
    "gramatica": ["…"],
    "vocabulario": ["…"]
  },
  "recursos": [ { "tipo": "youtube", "titulo": "…", "url": "…", "fuente": "…", "descripcion": "…" } ],
  "quiz": [ { "frase": "…", "correcta": true, "explicacion": "…" } ]
}
```

**Tipos de recurso** (`tipo`):

| tipo | `url` | Cómo se ve |
|---|---|---|
| `youtube` | enlace normal de YouTube (`watch?v=`, `youtu.be/`, `shorts/`) | Miniatura. Al pulsarla se abre un visor grande con `youtube-nocookie.com`. El reproductor no se carga hasta que se pulsa. |
| `vimeo` | `https://vimeo.com/123456789` | Visor grande. |
| `audio` | enlace directo a un `.mp3` / `.ogg` | Reproductor propio en un visor grande. |
| `libro` | (vacía) | Tarjeta de lectura. Usa además `texto`, `autor`, `obra` y `anio`. Tiene un botón «Leer en grande» para la pizarra. |
| `web` | cualquier página | Intenta mostrar una vista previa. Muchas webs (como la RAE) no dejan mostrarse dentro de otra página: entonces aparece una tarjeta con el botón «Abrir en pestaña nueva». |

- Mientras `url` sea `"PENDIENTE"`, la tarjeta aparece como «Próximamente» y no se puede abrir.
- Los fragmentos de libros deben ser **citas breves** con su referencia, nunca páginas enteras.
- Revisa que el JSON siga siendo válido después de editarlo, por ejemplo pegándolo en <https://jsonlint.com>. Si falta una coma, el mapa no carga.

**Estado actual:** las 34 regiones tienen sus rasgos y su quiz. **Argentina, Andaluz occidental y México** están desarrolladas por completo como modelo, con los cinco tipos de recurso. En el resto, los vídeos y audios están en `PENDIENTE`. Los únicos enlaces reales son los que se sabe con seguridad que existen (Diccionario panhispánico de dudas y Centro Virtual Cervantes).

### Fuentes fiables para completar los recursos
- **Dialectoteca del español**: vídeos y audios de hablantes de todo el mundo hispánico, con transcripción.
- **COSER, Corpus Oral y Sonoro del Español Rural** (corpusrural.es): entrevistas grabadas en pueblos de España. Es ideal para las regiones españolas.
- **PRESEEA**: grabaciones del habla urbana de ciudades de España y América.
- **Biblioteca Virtual Miguel de Cervantes** (cervantesvirtual.com): textos literarios para los fragmentos de lectura.
- **Centro Virtual Cervantes** (cvc.cervantes.es): artículos y materiales sobre el español en el mundo.
- **RTVE Play y el Archivo de RTVE**: reportajes y documentales.
- **Diccionario panhispánico de dudas** (rae.es/dpd): para justificar qué es correcto y qué no.

---

## 4. Las regiones de España: fuente y criterios

`data/espana-regiones.geojson` se ha construido **uniendo provincias** (códigos INE) a partir de los límites oficiales del Instituto Geográfico Nacional (paquete `es-atlas`, datos del IGN/CNIG). El script está en `herramientas/generar-datos.js`.

| Región dialectal | Provincias |
|---|---|
| Castellano septentrional | Castilla y León (Ávila, Burgos, León, Palencia, Salamanca, Segovia, Soria, Valladolid, Zamora) |
| Castellano centro y madrileño | Madrid y Castilla-La Mancha |
| Andaluz occidental | Huelva, Sevilla, Cádiz, Córdoba y Ceuta |
| Andaluz oriental | Málaga, Granada, Jaén, Almería y Melilla |
| Murciano | Región de Murcia |
| Extremeño | Badajoz y Cáceres |
| Canario | Las Palmas y Santa Cruz de Tenerife (aparecen también en un recuadro junto a la península) |
| Contacto con catalán y valenciano | Barcelona, Girona, Lleida, Tarragona, Castellón, Valencia, Alicante e Illes Balears |
| Contacto con gallego | A Coruña, Lugo, Ourense y Pontevedra |
| Contacto con euskera | Álava, Bizkaia, Gipuzkoa y Navarra |
| Asturias y Cantabria | Asturias y Cantabria |
| Aragón y La Rioja | Huesca, Teruel, Zaragoza y La Rioja |

**Criterios.**
- Las fronteras entre dialectos no siguen las provinciales: son franjas graduales (isoglosas). Usar provincias es una simplificación didáctica que permite reconocer el territorio.
- **Andalucía occidental y oriental.** La isoglosa tradicional que separa las dos zonas (abertura de vocales, «ustedes» frente a «vosotros») cruza Córdoba y Málaga. Hemos asignado Córdoba a la zona occidental y Málaga a la oriental.
- **Asturias y Cantabria se separan de Aragón y La Rioja.** Las dos primeras comparten el contacto con el asturleonés (cierre de -o en -u, diminutivos -ín/-uco). Aragón y La Rioja comparten huellas del aragonés (-ico, cierzo, ababol) y la entonación del valle del Ebro. Juntar las cuatro en una sola región mezclaría rasgos sin relación, y dos regiones se explican mejor en clase.
- Ceuta y Melilla van con el andaluz, por la cercanía de su habla.

Otros datos geográficos:
- **Países**: Natural Earth 1:50m (paquete `world-atlas`), simplificado para que cargue rápido. Los nombres en español salen de los datos de idioma del navegador (CLDR).
- **Relieve**: un trazado aproximado y simplificado de los ejes de cada cordillera, hecho a mano solo como orientación visual.

---

## 5. Registro para el profesorado

Cada vez que un equipo **abre una región**, **la marca como vista** (o la desmarca) o **abre un recurso**, se guarda un evento con la fecha y hora, el equipo, los integrantes, la región, la acción y el recurso.

- Siempre se guarda una copia en el propio dispositivo (`localStorage`).
- Si conectas Google Sheets, los eventos se envían también a tu hoja. Si no hay conexión, quedan en cola y se reintentan al recuperarla (y cada minuto).

### Panel del profesor
- Ábrelo **pulsando 5 veces seguidas el logo «ñ»** (o con **Ctrl + Mayús + P**) y escribe el PIN.
- El PIN por defecto es `1234`. Cámbialo en la constante `PIN_PROFESOR`, al principio de `app.js`.
- Muestra una tabla de regiones × equipos de ese dispositivo y permite:
  - Exportar a CSV, en dos archivos: eventos y resumen. Usan separador `;` y UTF-8 con BOM, así que se abren bien en Excel.
  - Reintentar el envío a Google Sheets.
  - Borrar el registro: elimina los eventos y el progreso de todos los equipos en ese dispositivo.
- El PIN solo evita que el alumnado entre por accidente. No es una medida de seguridad: quien sepa leer el código fuente puede verlo.

### Conectar con Google Sheets (paso a paso)
1. **Crea la hoja.** En Google Drive: *Nuevo → Hojas de cálculo de Google*. Ponle un nombre, por ejemplo «Registro acentos 6.º». No hace falta crear pestañas: el script crea «Eventos» y «Resumen».
2. **Abre el editor de scripts.** En la hoja: *Extensiones → Apps Script*. Se abre una pestaña nueva con un archivo `Código.gs` que contiene una función vacía.
3. **Pega el código.** Borra todo lo que hay en `Código.gs`, pega el contenido de `apps-script/registro.gs` y pulsa el icono del disquete (*Guardar proyecto*).
4. **Publícalo como aplicación web.** Arriba a la derecha: botón azul *Implementar → Nueva implementación*. En la ventana, pulsa el engranaje junto a «Seleccionar tipo» y elige *Aplicación web*. Rellena:
   - *Descripción*: «Registro acentos».
   - *Ejecutar como*: **Yo** (tu cuenta).
   - *Quién tiene acceso*: **Cualquier usuario**. Es necesario para que la web pueda enviar datos sin que el alumnado inicie sesión.
5. **Autoriza.** Pulsa *Implementar*. Google pide permisos: *Autorizar acceso*, elige tu cuenta y, si aparece «Google no ha verificado esta aplicación», pulsa *Configuración avanzada → Ir a … (no seguro)*. Es tu propio script. Por último pulsa *Permitir*.
6. **Copia la URL.** La ventana final muestra la *URL de la aplicación web*, que termina en `/exec`. Cópiala.
7. **Pégala en `app.js`**, en la primera constante:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```
   Vuelve a publicar la web (paso 2).
8. **Comprueba que funciona.** Abre esa URL en el navegador: debe aparecer `{"ok":true,…}`. Después abre una región en el mapa y, a los pocos segundos, verás una fila nueva en la pestaña «Eventos».

> Si más adelante cambias el script, usa *Implementar → Gestionar implementaciones → editar (lápiz) → Versión: nueva versión*. Así la URL no cambia.

Limitación conocida: por cómo funciona Apps Script, la web no puede leer la respuesta del servidor. Solo detecta fallos de conexión (que se reintentan), no errores dentro del script. Si los eventos no llegan, mira *Ejecuciones* en el editor de Apps Script.

**Privacidad:** se guardan solo los nombres que escribe el equipo. Se recomienda usar nombres de pila o alias.

---

## 6. Accesibilidad y uso en clase

- **Teclado.** En la lista de regiones se navega con Tab y con las flechas ↑/↓. En el mapa (cuando tiene el foco): flechas para mover, `+`/`−` para el zoom y `0` para volver al mundo. `Esc` cierra el panel.
- **Pantallas táctiles.** Todos los botones miden al menos 44 px. Guinea Ecuatorial, Puerto Rico y Filipinas tienen un punto con una zona de toque ampliada.
- **Movimiento reducido.** Se respeta `prefers-reduced-motion`: sin animaciones de zoom ni de paneles.
- **Pizarra digital.** A partir de 1600 px de ancho el texto es mayor. Vídeos, audios y lecturas se abren en un visor grande.
