# RadioAlarm

Despertador web que suena con un **tono clásico**, una **canción de tu dispositivo**
o directamente una **emisora de radio**.

Es una aplicación web estática (HTML + CSS + JavaScript, sin backend), así que el mismo
código se sirve en local con XAMPP, se publica en GitHub Pages y se instala en el móvil
como aplicación.

---

## Cómo abrirla en local

El proyecto se enlaza en `htdocs` con una unión de directorio, para no duplicar archivos:

```bash
cmd /c mklink /J "C:\xampp\htdocs\RadioAlarm" "C:\Users\j-f-r\Documents\DEV\Repositorios\RadioAlarm"
```

Con Apache arrancado desde el panel de XAMPP:

<http://localhost/RadioAlarm/>

> Servirla desde `http://localhost` (y no abriendo el archivo directamente) es
> **obligatorio**: los módulos de JavaScript no cargan sobre `file://`, e IndexedDB y el
> futuro service worker solo funcionan en un contexto seguro.
>
> El `.htaccess` de la raíz desactiva la caché del navegador para `.html`, `.css` y `.js`:
> sin él, Chrome puede tardar varios minutos en servir un archivo recién guardado. Solo
> afecta a este servidor local (Apache); GitHub Pages no lo lee.

---

## Estructura

```
RadioAlarm/
├── .htaccess            Desactiva la caché del navegador (solo desarrollo local)
├── index.html           Pantalla principal
├── css/
│   ├── tokens.css       Tokens de diseño y temas día/noche
│   ├── base.css         Reinicio, tipografía y estructura
│   └── components.css   Componentes reutilizables
├── js/
│   ├── app.js           Punto de entrada
│   ├── theme.js         Conmutador día/noche
│   ├── store.js         Persistencia sobre localStorage
│   ├── audio/
│   │   ├── sintetizador.js  Genera los tonos con Web Audio; también en bucle y con rampa
│   │   ├── reproductor.js  Canción y emisora: vista previa, y en bucle con rampa al sonar
│   │   └── desbloqueo.js   Desbloquea el audio en el primer gesto del usuario
│   ├── datos/
│   │   ├── tonos.js     Catálogo de tonos
│   │   └── emisoras.js  Catálogo de emisoras de radio
│   ├── store/
│   │   └── audioBlobs.js  Guarda los archivos de canción en IndexedDB
│   ├── model/
│   │   ├── alarma.js    Esquema, saneado, próximo disparo y qué debe sonar
│   │   └── alarmas.js   Repositorio: altas, bajas, consultas y marcar como sonada
│   ├── motor/
│   │   ├── motor.js      Comprobación periódica, cola, pospuesto y ciclo de vida del sonido
│   │   ├── tiempo.js     Cronómetro y cuenta atrás: lógica pura, sin DOM ni temporizadores
│   │   ├── vibracion.js  Repite `navigator.vibrate` mientras algo suena
│   │   └── vigilia.js    Wake Lock: mantiene la pantalla encendida si algo lo necesita
│   └── ui/
│       ├── vistas.js       Navegación entre pantallas
│       ├── alarmas.js      Vista del listado de alarmas
│       ├── editor.js       Editor de alarma: crear y editar
│       ├── crono.js        Vista del cronómetro
│       ├── cuentaAtras.js  Vista de la cuenta atrás
│       ├── sonido.js       Vista de opciones de sonido (tono, canción y emisora favoritos)
│       ├── selectorTono.js    Widget de tono: lista, selección y reproducción
│       ├── selectorCancion.js Widget de canción: elegir archivo, guardar, escuchar
│       ├── selectorEmisora.js Widget de emisora: lista de presets + personalizada, y probar
│       ├── plegable.js     Listas que se despliegan y encogen
│       ├── layout.js       Medidas de la barra inferior
│       └── toast.js        Avisos flotantes
├── tests/
│   ├── arnes.mjs         Arnés mínimo de pruebas, compartido por los dos archivos siguientes
│   ├── modelo.test.mjs   Pruebas del modelo de alarmas
│   └── motor.test.mjs    Pruebas del cronómetro y la cuenta atrás
└── docs/
    └── MANUAL.md         Manual de uso
```

### Capas

```
ui/  →  model/  →  store.js       →  localStorage   (alarmas, tema, favoritos)
        datos/  →  store/audioBlobs.js  →  IndexedDB      (archivos de canción)
```

La interfaz nunca lee el almacenamiento directamente: pasa por `model/`, que
devuelve alarmas ya saneadas. `model/alarma.js` es lógica pura —sin DOM y sin
almacenamiento— para poder probarla fuera del navegador.

Los audios de canción no viven en `localStorage` —tiene una cuota de pocos MB, y un
archivo de audio ya la agotaría— sino en IndexedDB, vía `store/audioBlobs.js`. Cada
alarma guarda solo el `id` de su canción; el archivo en sí se busca en IndexedDB al
elegirlo, al escucharlo y al sonar.

### El motor de disparo

`motor/motor.js` comprueba cada segundo si alguna alarma debe sonar, con
`model/alarma.js`'s `alarmasQueDebenSonar(alarmas, desde, hasta)`: una función pura que
mira qué ha pasado *entre* la comprobación anterior y la actual, no solo si "ahora" coincide
con una hora en punto. Así, si la pestaña ha estado en segundo plano o el equipo suspendido,
la alarma se detecta en cuanto se vuelve a comprobar, en vez de perderse sin más —y si el
retraso pasa de dos minutos, la pantalla de alarma lo señala como perdida—.

El pospuesto vive en memoria, dentro de `motor.js`, no en el almacenamiento: es un
reintento de la sesión en curso, no un dato permanente de la alarma. Si la página se
recarga a media espera de un pospuesto, ese pospuesto en concreto se pierde.

Una alarma de «una vez» se desactiva (`marcarComoSonada`, en `model/alarmas.js`) en cuanto
empieza a sonar, no al descartarla: si nadie llega a tocar nada, no debe reaparecer sola al
día siguiente.

### Cronómetro y cuenta atrás

`motor/tiempo.js` es lógica pura, en la misma línea que `alarmasQueDebenSonar`: cada función
recibe el instante actual como parámetro en vez de leer el reloj por su cuenta, así que se
puede probar con marcas de tiempo fijas. `js/ui/crono.js` y `js/ui/cuentaAtras.js` son los
que la conectan a un `setInterval` de verdad y la pintan.

Los dos siguen corriendo si se navega a otra vista —el intervalo no depende de qué pantalla
esté abierta, solo el repintado—, y los dos piden vigilia mientras están en marcha, con su
propia clave (`"crono"`, `"cuenta-atras"`) independiente de la de las alarmas
(`"alarmas"`): pueden necesitarla varias cosas a la vez, y la pantalla solo se libera cuando
ya no la necesita ninguna.

Al llegar a cero, la cuenta atrás suena y vibra igual que una alarma —reutiliza
`sintetizador.js` y `vibracion.js`, con el tono favorito de Opciones de sonido—, pero con su
propio aviso a pantalla completa: un temporizador no tiene "posponer" ni "se ha perdido".

### Catálogo de emisoras

`datos/emisoras.js` trae siete emisoras de serie —comprobadas una a una, cada una
respondiendo con `200` y un tipo de audio real, al escribir este archivo—, y
`selectorEmisora.js` las presenta con el mismo patrón que el selector de tono: lista
plegada por defecto, selección al estilo radio y reproducción al elegir. La lista termina
con una opción «Personalizada» que revela los campos de nombre y URL para cualquier otra
emisora, con su propio botón «Probar».

Quedaron fuera **Cadena 100** y **Rock FM**: sus streams solo existen en HLS (`.m3u8`); se
comprobó que su propio reproductor oficial usa una librería (hls.js) para convertirlo en
algo reproducible en Chrome, y un `<audio src>` normal no lo consigue —caería siempre al
tono—. Añadirlas exigiría sumar esa dependencia solo para dos emisoras, lo que rompería el
principio de cero dependencias del proyecto. También **Máxima FM**: como emisora nacional
dejó de emitir en 2019, sustituida por LOS40 Dance, que ya está en la lista.

---

## Pruebas

```bash
npm test
```

Dos archivos, con el mismo arnés mínimo (`tests/arnes.mjs`) y sin dependencias ni
framework. `modelo.test.mjs` cubre el saneado del dato (incluida la canción, que necesita
un `id` válido de IndexedDB o se descarta), el cálculo del próximo disparo (incluidos el
cambio de horario y el caso «solo hoy y la hora ya pasada»), qué alarmas deben sonar entre
dos instantes —el corazón del motor: detecta un disparo aunque la comprobación llegue
tarde, y nunca lo duplica—, el repositorio con un `localStorage` de mentira y la
correspondencia entre el catálogo de tonos y los patrones del sintetizador. `motor.test.mjs`
cubre el cronómetro y la cuenta atrás: pausar y reanudar, que «comprobar» solo avise una vez
de que ha terminado, y el formato de los relojes.

Lo que no cubren: todo lo que toca IndexedDB, `<input type="file">`, el elemento `<audio>`,
Web Audio o la Wake Lock API (`selectorCancion.js`, `selectorEmisora.js`,
`reproductor.js`, `sintetizador.js`, `store/audioBlobs.js`, `motor/motor.js`,
`motor/vigilia.js`, `motor/vibracion.js`). Esas piezas se han probado a mano en el
navegador; Node no tiene ninguna de esas APIs sin añadir dependencias.

No hay `npm install`: `package.json` solo existe para declarar `"type": "module"` —que es
lo que hace que Node lea los archivos `.js` como módulos— y el atajo de las pruebas. La
aplicación no tiene ninguna dependencia.

---

## Diseño

Paleta corporativa AXPA365:

| Color | Uso |
|---|---|
| Turquesa `#1DB89A` | Acento principal: acciones, alarmas activas |
| Amarillo `#F5C200` | Acento secundario: alarma sonando, avisos |

Los colores se declaran una sola vez en `css/tokens.css`. El tema noche redefine los
tokens semánticos y aclara ligeramente el turquesa para mantener el contraste.

---

## Hoja de ruta

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Esqueleto, tokens de diseño, tema día/noche y navegación entre vistas | ✅ Hecha |
| 2 | Modelo de datos y almacenamiento | ✅ Hecha |
| 3 | Pantalla principal con el listado de alarmas | ✅ Hecha |
| 4 | Editor de alarma | ✅ Hecha |
| 5 | Fuentes de sonido: tonos sintetizados, canción y radio | ✅ Hecha |
| 6 | Motor de disparo y pantalla de alarma sonando | ✅ Hecha |
| 7 | Cronómetro y temporizador de cuenta atrás | ✅ Hecha |
| 8 | Convertirla en PWA instalable | Pendiente |
| 9 | Publicación en GitHub Pages y manual | Pendiente |
| 10 | Envoltorio Android nativo: alarma con el móvil bloqueado y tonos del sistema | Pendiente |

---

## Limitaciones conocidas

Documentadas aquí desde el principio porque condicionan el diseño:

- **Como web, la app debe permanecer abierta** para que la alarma suene. No existe una API
  web fiable para programar un aviso futuro con todo cerrado. La Fase 6 lo mitiga con Wake
  Lock —mantiene la pantalla encendida mientras haya una alarma próxima, un cronómetro
  corriendo o una cuenta atrás en marcha, para que la pestaña siga en primer plano y no se
  suspenda—, y la Fase 10 lo resuelve de verdad con el despertador nativo de Android.
- **Wake Lock no está en todos los navegadores.** Safari y Firefox de escritorio no la
  implementan; ahí no hay forma de evitar que la pantalla se apague sola. Tampoco es una
  garantía aunque exista: el sistema operativo puede denegarla (batería baja, por ejemplo).
  Nada de lo que la pide depende de que esté realmente concedida para funcionar; es una
  ayuda, no la base.
- **Un pospuesto se pierde si la página se recarga mientras está a la espera.** Vive en
  memoria, no en el almacenamiento: es un reintento de la sesión en curso, no un dato
  permanente de la alarma.
- **El cronómetro y la cuenta atrás también viven solo en memoria.** Recargar la página los
  pone a cero, corran o no en ese momento: son herramientas de la sesión en curso, no datos
  que tenga sentido conservar entre visitas.
- **En iPhone la fiabilidad es baja.** Safari suspende las apps en segundo plano de forma
  agresiva y Apple no ofrece a terceros un equivalente al despertador del sistema.
- **El audio necesita una interacción previa** del usuario para desbloquearse (política de
  autoplay de los navegadores). `audio/desbloqueo.js` lo hace en el primer gesto —cualquiera,
  no tiene que ser sobre un botón de sonido— para que quede desbloqueado el resto de la
  sesión, y la alarma pueda sonar sin que nadie toque nada justo antes.
- **En GitHub Pages, las emisoras deben usar `https://`.** Los streams `http://` se bloquean
  por contenido mixto.
- **Las emisoras de serie pueden dejar de funcionar con el tiempo.** Una URL de stream se
  queda anticuada con facilidad —la emisora cambia de proveedor, cierra el stream
  antiguo—; se comprobaron todas al escribir `datos/emisoras.js`, pero eso no es una
  garantía para siempre. Si una deja de sonar, cae al tono automáticamente (no se queda en
  silencio) y se puede sustituir por su URL nueva, o el usuario puede escribir la suya con
  la opción «Personalizada».
- **Los tonos de fábrica del móvil no son accesibles desde el navegador.** Viven en una
  carpeta protegida del sistema y solo `RingtoneManager` (nativo) los expone. Por eso los
  tonos incluidos se generan por síntesis con Web Audio, y la lista completa del sistema
  no llega hasta la Fase 10.
- **Los archivos de canción se guardan enteros en el dispositivo**, vía IndexedDB: no hay
  selector de carpetas ni acceso en vivo al sistema de archivos (eso exigiría volver a
  pedir permiso en cada sesión y no funciona en móvil). La contrapartida es la cuota de
  almacenamiento del navegador, normalmente holgada pero no ilimitada.
- **Un audio de canción reemplazado o quitado no se borra solo de IndexedDB.** Una alarma
  nueva parte del mismo archivo que el favorito global (no de una copia), así que borrar
  "el anterior" al elegir uno distinto podría borrar el de otra alarma sin que nadie lo
  pidiera. Sin contar cuántos sitios usan cada archivo no hay forma segura de saber cuándo
  ya no lo usa nadie, así que de momento se queda guardado.
