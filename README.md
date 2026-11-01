# Cartografía dialectal del español

Mapa interactivo para trabajar las variedades del español en 6.º de Primaria. Los equipos exploran el mapa y eligen una región. Se abre una ventana grande, en el centro de la pantalla, con los recursos de esa región: vídeos, audios, archivos y enlaces. Además, el botón **Curiosidades** muestra datos curiosos de los 21 países donde el español es lengua oficial.

Está hecha con HTML, CSS y JavaScript, sin frameworks ni compilación. Usa D3 v7 y topojson-client desde jsDelivr.

```
index.html
styles.css
app.js                        ← configuración al principio (URL de Google, PIN)
data/mundo.topojson           ← países (Natural Earth 1:50m, simplificado)
data/espana-regiones.geojson  ← 12 regiones dialectales de España
data/relieve.geojson          ← cordilleras principales (trazado aproximado)
data/regiones.json            ← RECURSOS DE CADA REGIÓN (lo que edita el profesorado)
data/curiosidades.json        ← curiosidades de cada país hispanohablante
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

## 3. Añadir contenidos (`data/regiones.json`)

Las 34 regiones ya están creadas. México, Cuba, República Dominicana, Venezuela, Bolivia, Argentina, el contacto con el euskera y los dos andaluces ya tienen material (radios, vídeos, periódicos y textos literarios); el resto tiene la lista `recursos` vacía, preparada para rellenarla. Mientras esté vacía, la ventana de la región muestra «Todavía no hay vídeos, audios ni enlaces para esta región».

En la ventana de cada región los recursos se ordenan en apartados: **Para escuchar** (radio, vídeo y audio, con icono de micrófono), **Prensa** (con icono de periódico), **Textos literarios** y **Otros recursos**. Dentro de cada apartado se respeta el orden en que aparecen en el JSON.

Así es una región:

```json
{
  "id": "ar",                 // no lo cambies: une la región con el mapa
  "nombre": "Argentina",
  "grupo": "América del Sur", // agrupa la lista lateral
  "bandera": "🇦🇷",           // emoji; se muestra como bandera SVG
  "color": "#93B5E3",         // color en el mapa
  "intro": "",                // opcional: un texto de presentación
  "recursos": []              // ← aquí van los vídeos, audios, archivos y enlaces
}
```

(Las regiones de España tienen además `zona`, que indica qué provincias abarca, y algunas `etiqueta`, un nombre corto para el mapa.)

Para añadir recursos, escríbelos dentro de `recursos`, separados por comas. Este ejemplo tiene uno de cada tipo:

```json
"recursos": [
  { "tipo": "radio",   "titulo": "Radio Betis 96.8 FM", "url": "https://radio.garden/listen/…", "fuente": "Radio Garden", "descripcion": "Radio sevillana en directo." },
  { "tipo": "periodico", "titulo": "El Universal", "url": "https://www.eluniversal.com.mx/" },
  { "tipo": "youtube", "titulo": "Hablantes de Buenos Aires", "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX", "fuente": "RTVE", "descripcion": "Fijaos en cómo dicen «yo» y «calle»." },
  { "tipo": "vimeo",   "titulo": "Documental", "url": "https://vimeo.com/123456789" },
  { "tipo": "audio",   "titulo": "Entrevista", "url": "https://…/entrevista.mp3", "fuente": "COSER" },
  { "tipo": "archivo", "titulo": "Ficha de trabajo", "url": "archivos/ficha-argentina.pdf" },
  { "tipo": "web",     "titulo": "El voseo", "url": "https://www.rae.es/dpd/voseo", "fuente": "RAE" },
  { "tipo": "libro",   "titulo": "Martín Fierro", "texto": "Aquí me pongo a cantar…", "autor": "José Hernández", "obra": "Martín Fierro", "anio": "1872" },
  { "tipo": "cita",    "texto": "«…texto literal…»", "referencia": "Arlt, R. (2018). *El juguete rabioso*. Biblioteca Digital ILCE.", "url": "https://…/JugueteRabioso_Artl.pdf" }
]
```

Solo son obligatorios `tipo`, `titulo` y `url` (en `libro`, `texto` en lugar de `url`; en `cita`, `texto` y `referencia` en lugar de `titulo`). `fuente` y `descripcion` son opcionales.

| tipo | `url` | Cómo se ve |
|---|---|---|
| `radio` | página de la emisora (por ejemplo, en Radio Garden) | Tarjeta con icono de micrófono. Se abre en una pestaña nueva, porque estas webs no dejan mostrarse dentro de otra. |
| `periodico` | página del periódico | Tarjeta con icono de periódico. Se abre en una pestaña nueva. |
| `youtube` | enlace normal de YouTube (`watch?v=`, `youtu.be/`, `shorts/`) | Tarjeta con icono de micrófono. Al pulsarla se abre un visor grande con `youtube-nocookie.com`. El reproductor no se carga hasta que se pulsa. |
| `vimeo` | `https://vimeo.com/123456789` | Tarjeta con icono de micrófono; visor grande. |
| `audio` | enlace directo a un `.mp3` / `.ogg` | Tarjeta con icono de micrófono; reproductor propio en un visor grande. |
| `archivo` | un PDF, una imagen u otro archivo | Los PDF y las imágenes se ven dentro de la página. El resto de archivos tiene un botón para abrirlos o descargarlos. |
| `web` | cualquier página | Intenta mostrar una vista previa. Muchas webs (como la RAE) no dejan mostrarse dentro de otra página: entonces aparece una tarjeta con el botón «Abrir en pestaña nueva». |
| `libro` | (sin url) | Tarjeta de lectura con una cita breve, y botón «Leer en grande» para la pizarra. |
| `cita` | enlace de la referencia bibliográfica | Página con aspecto de libro antiguo: el `texto` tal cual, un florón y debajo la `referencia` seguida del enlace. Lo que va entre `*asteriscos*` en la referencia sale en cursiva (el título de la obra). Si una región tiene varias citas, se numeran (I, II…). Botón «Leer en grande» para la pizarra. |

- **Archivos propios** (PDF, imágenes, audios): crea una carpeta `archivos/` en el repositorio, súbelos ahí y usa la ruta relativa (`archivos/nombre.pdf`). Evita espacios y tildes en los nombres de archivo.
- Si pones `"url": "PENDIENTE"`, la tarjeta aparece como «Próximamente» y no se puede abrir. Sirve para dejar recursos anunciados.
- Revisa que el JSON siga siendo válido después de editarlo, por ejemplo pegándolo en <https://jsonlint.com>. Si falta una coma, el mapa no carga.

### Curiosidades (`data/curiosidades.json`)
Hay una entrada por país, con `nombre`, `bandera`, `grupo` y una lista `curiosidades`. Puedes editar, añadir o quitar frases libremente.

### Fuentes fiables para buscar recursos
- **Dialectoteca del español**: vídeos y audios de hablantes de todo el mundo hispánico.
- **COSER, Corpus Oral y Sonoro del Español Rural** (corpusrural.es): entrevistas grabadas en pueblos de España.
- **PRESEEA**: grabaciones del habla de ciudades de España y América.
- **Biblioteca Virtual Miguel de Cervantes** (cervantesvirtual.com) y **Centro Virtual Cervantes** (cvc.cervantes.es).
- **RTVE Play y el Archivo de RTVE**.
- **Diccionario panhispánico de dudas** (rae.es/dpd).

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

Cada vez que un equipo **abre una región**, **abre un recurso** o **abre las curiosidades**, se guarda un evento con la fecha y hora, el equipo, los integrantes, la región, la acción y el recurso.

**Regiones exploradas.** Una región se marca como explorada **automáticamente** cuando el equipo la tiene abierta **3 minutos seguidos**. Abajo, la ventana muestra una cuenta atrás. El tiempo solo cuenta con la pestaña visible y vuelve a empezar si se cierra la región. Para cambiar la duración, edita `SEGUNDOS_VISTA` al principio de `app.js` (180 = 3 minutos). Al cumplirse el tiempo se registra el evento «Marcar como vista».

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
1. **Crea la hoja.** En Google Drive: *Nuevo → Hojas de cálculo de Google*. Ponle un nombre, por ejemplo «Registro cartografía 6.º». No hace falta crear pestañas: el script crea «Eventos» y «Resumen».
2. **Abre el editor de scripts.** En la hoja: *Extensiones → Apps Script*. Se abre una pestaña nueva con un archivo `Código.gs` que contiene una función vacía.
3. **Pega el código.** Borra todo lo que hay en `Código.gs`, pega el contenido de `apps-script/registro.gs` y pulsa el icono del disquete (*Guardar proyecto*).
4. **Publícalo como aplicación web.** Arriba a la derecha: botón azul *Implementar → Nueva implementación*. En la ventana, pulsa el engranaje junto a «Seleccionar tipo» y elige *Aplicación web*. Rellena:
   - *Descripción*: «Registro cartografía».
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

- **Teclado.** En la lista de regiones se navega con Tab y con las flechas ↑/↓. En el mapa (cuando tiene el foco): flechas para mover, `+`/`−` para el zoom y `0` para ver el mundo entero. `Esc` cierra la ventana de la región.
- **Pantallas táctiles.** Todos los botones miden al menos 44 px. Guinea Ecuatorial, Puerto Rico y Filipinas tienen un punto con una zona de toque ampliada.
- **Movimiento reducido.** Se respeta `prefers-reduced-motion`: sin animaciones de zoom ni de paneles.
- **Pizarra digital.** A partir de 1600 px de ancho el texto es mayor. La ventana de cada región ocupa al menos el 70 % del ancho de la pantalla, y vídeos, audios y archivos se abren en un visor grande.
