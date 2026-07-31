# Manual de RadioAlarm

Despertador que suena con un **tono**, una **canción de tu dispositivo** o una **emisora
de radio en directo**. Este manual cubre las **fases 1 a 9** de 10: todo lo que hace la
aplicación está terminado y funciona de verdad. Solo queda la **fase 10**, la versión
nativa de Android con la alarma sonando aunque el móvil esté bloqueado.

---

## 1. Abrir la aplicación

### Ya publicada

<https://JaviRoma1984.github.io/RadioAlarm/>

Ábrela con el navegador del móvil o del ordenador. No hace falta instalar nada para
usarla, aunque instalarla (siguiente apartado) hace que abra más rápido y funcione sin
conexión.

### En local, para desarrollo

Con Apache arrancado en XAMPP:

<http://localhost/RadioAlarm/>

Si la dirección da error 404, falta la unión de directorio en `htdocs`. Se crea una única
vez con:

```bash
cmd /c mklink /J "C:\xampp\htdocs\RadioAlarm" "C:\Users\j-f-r\Documents\DEV\Repositorios\RadioAlarm"
```

---

## 2. Instalarla en el móvil o el ordenador

RadioAlarm es una **PWA** (aplicación web progresiva): se instala como una aplicación de
verdad, con su propio icono, sin pasar por ninguna tienda de aplicaciones.

**Android / Chrome, Edge, escritorio.** Al visitar la página aparece un aviso o un botón
para **instalar la aplicación** (según el navegador, en la barra de direcciones o en el
menú ⋮). Al aceptar, queda instalada con su icono, como cualquier otra aplicación.

**iPhone / Safari.** Safari no ofrece ese aviso automático. Toca el botón de **compartir**
(el cuadrado con la flecha hacia arriba) y elige **Añadir a pantalla de inicio**.

Instalada o no, la aplicación es la misma: instalarla solo cambia cómo se abre —con su
propio icono, sin la barra del navegador alrededor— y que, una vez abierta al menos una
vez con conexión, **vuelve a abrir sin internet**.

### Actualizaciones

Cuando se publica una versión nueva, la aplicación sigue mostrando la que ya tenías
abierta —para no cortar una alarma sonando o un cronómetro en marcha a media ejecución—
y avisa con un mensaje: *«Hay una versión nueva. Se aplicará la próxima vez que abras la
app»*. Cierra la aplicación del todo y vuelve a abrirla para tenerla.

---

## 3. Partes de la pantalla

**Cabecera.** El nombre de la aplicación y, a la derecha, el botón de cambio de tema.

**Zona central.** El listado de tus alarmas. Mientras no tengas ninguna, muestra un mensaje
de bienvenida.

**Botón flotante «Crear».** El círculo turquesa con el signo **+**, centrado justo encima
de la barra inferior. Es la acción principal: crear una alarma nueva.

**Barra inferior.** Las cuatro acciones secundarias:

| Botón | Icono | Para qué sirve |
|---|---|---|
| **Alarmas** | Despertador | Volver al panel principal, el listado de alarmas |
| **Crono** | Cronómetro | Medir tiempo hacia adelante |
| **Cuenta atrás** | Reloj de arena | Temporizador que avisa al llegar a cero |
| **Sonido** | Altavoz | Elegir el tono, la canción y la emisora favoritos |

**Alarmas** es la única forma de volver al listado desde **Crono** o **Cuenta atrás**:
esas dos pantallas no tienen su propio botón «Volver atrás», porque ninguna de las dos
tiene nada que guardar o descartar.

---

## 4. Tus alarmas

### Crear una alarma

Pulsa el botón **+**. Se abre el editor con la hora en punto siguiente a la actual ya
puesta —si son las 15:20, empieza en 16:00— y el resto de opciones con sus valores
habituales, listas para cambiar antes de guardar.

### Qué muestra cada alarma

| Elemento | Qué es |
|---|---|
| **Hora grande** | A qué hora suena |
| **Nombre** | El nombre que le has puesto |
| **Línea gris** | Cada cuánto se repite y con qué va a sonar. Por ejemplo *De lunes a viernes · Radio · LOS40* |
| **Línea turquesa** | Cuánto falta para que suene: *en 7 h 30 min*. Se refresca sola cada medio minuto |

Las alarmas aparecen **ordenadas por hora**, de la más temprana a la más tardía.

### Activar y desactivar

El **interruptor** de la derecha activa y desactiva la alarma sin borrarla. Una alarma
desactivada se apaga visualmente y su línea inferior pasa a decir *Desactivada*.

Es lo que te conviene para una alarma que usas solo algunos días: la desactivas y sigue ahí
con toda su configuración.

### Borrar

El botón de la **papelera**, debajo del interruptor. **Pregunta antes de borrar**, porque no
se puede deshacer.

### Editar

Al pulsar sobre una alarma se abre su editor, con todo lo que tenía puesto.

---

## 5. Editor de alarma

Se abre al **crear** una alarma nueva o al **pulsar sobre una** existente. Los cambios se
llevan en un borrador: solo se guardan al pulsar **Guardar cambios**.

### Nombre y hora

Arriba de todo, el nombre —déjalo en blanco y se llamará «Alarma»— y debajo la hora, con el
selector nativo del navegador o del móvil.

### Repetición

Dos opciones:

- **Sonar una vez.** Suena la próxima vez que llegue esa hora y se desactiva sola.
- **Personalizar.** Se despliega debajo un panel con los **7 días de la semana**. Toca los
  días en que quieres que suene; puedes marcar tantos como quieras. Si no marcas ninguno,
  la alarma se guarda pero no sonará —se avisa al guardar, y el listado la marca como *Sin
  días marcados*—.

### Sonido

Tres pestañas: **Tono**, **Canción** y **Radio**.

- **Tono** y **Radio** muestran, de solo lectura, el que tengas puesto en **Opciones de
  sonido** (apartado 7): no se eligen aquí. Es a propósito —hay un único tono y una única
  emisora favoritos en toda la aplicación, no uno distinto por alarma—, así que cambiarlos
  desde una alarma cambiaría el favorito de todas las demás sin avisar. Si quieres otro,
  ve a **Sonido**, en la barra inferior.
- **Canción**, en cambio, sí es propia de cada alarma: los botones **Elegir**, **Escuchar**
  y **Quitar** funcionan igual que en Opciones de sonido (ver 7.2), pero lo que elijas aquí
  solo afecta a esta alarma. Al crear una alarma nueva parte de la canción favorita, y
  puedes cambiarla sin que le pase nada a las demás ni al favorito global.

Si guardas con **Canción** puesta pero sin haber elegido ningún archivo, o con **Radio**
puesta sin tener ninguna emisora configurada en Opciones de sonido, la alarma se guarda
con el **tono** en su lugar, y se avisa del motivo al guardar.

### Vibración

Un interruptor. Vibra el dispositivo mientras suena la alarma, en los dispositivos que lo
permitan.

### Posponer

Dos contadores con botones **−** y **+**:

- **Veces** — cuántas veces se puede posponer, de 0 a 10. Con 0, la alarma no ofrece
  posponer al sonar.
- **Minutos entre pospuestos** — cuánto tarda en volver a sonar tras posponerla, de 1 a 60.
  Este contador se oculta si has puesto **Veces** a 0: no tiene sentido preguntarlo si no se
  va a posponer nunca.

### Guardar, volver y borrar

- **Guardar cambios** — guarda la alarma y vuelve a la pantalla principal.
- **Volver atrás** — vuelve sin guardar. Si tenías cambios pendientes, se descartan y te
  avisa de ello.
- **Borrar esta alarma** — solo aparece al editar una alarma ya existente, nunca al crear
  una nueva. Pregunta antes de borrar.

---

## 6. Cuando salta una alarma

Al llegar la hora, aparezca lo que aparezca en pantalla, se abre un aviso a pantalla
completa: la hora actual, el nombre de la alarma y dos botones.

- **Posponer X min** — solo aparece si aún quedan pospuestos disponibles; el número es
  los minutos configurados en esa alarma. Vuelve a sonar pasado ese tiempo, hasta agotar
  las veces marcadas.
- **Descartar** — apaga la alarma. Si es de «sonar una vez», queda desactivada; si es de
  varios días, volverá a sonar el próximo día marcado.

Si la aplicación estuvo en segundo plano o el dispositivo suspendido y la alarma se detecta
con más de dos minutos de retraso, el aviso añade *«Tenía que sonar a las…»* para que sepas
que ha llegado tarde.

El sonido empieza flojo y sube de volumen poco a poco durante unos segundos, y si tienes
la vibración activada, el dispositivo vibra a la vez. Si solo suena con el móvil bloqueado
del todo o con la aplicación cerrada, puede no sonar: lee el apartado 12 sobre esta
limitación.

Si dos alarmas coinciden, se atienden **una detrás de otra**, nunca las dos a la vez.

---

## 7. Opciones de sonido

Pulsa **Sonido** en la barra inferior. La zona central cambia y muestra tres apartados.
El botón queda resaltado en turquesa mientras estás en esta pantalla.

### 7.1 Tono

De entrada el apartado muestra solo tres cosas: la descripción, la línea **Tono elegido**
con el nombre del que tienes puesto, y el botón **Explorar tonos**.

Al pulsar **Explorar tonos** se despliega el listado completo de los nueve timbres. El
botón pasa a decir **Ocultar tonos** y la flecha gira, para que se vea de un vistazo si
está abierto o cerrado.

**Solo puede haber un tono seleccionado.** Al pulsar uno nuevo, el anterior se deselecciona
automáticamente, y no hay forma de quedarse sin ninguno: **Clásico** viene puesto de
fábrica y, si pulsas el que ya está marcado, sigue marcado. La línea **Tono elegido** se
actualiza al instante, así que puedes cerrar el listado y seguir viendo cuál tienes. Este
tono es el que usan también el cronómetro y la cuenta atrás al terminar.

#### Al pulsar un tono, se oye

Cada tono suena en cuanto lo seleccionas, para que puedas compararlos sin salir de la
pantalla. Mientras se está oyendo, la opción se resalta en **amarillo**.

- Si pulsas el tono que ya tienes marcado, **vuelve a sonar**.
- Si pulsas otro antes de que acabe, el anterior se corta y empieza el nuevo.
- El sonido se corta solo al **guardar** o al **volver atrás**.

| Tono | Cómo suena |
|---|---|
| **Clásico** | Timbre de despertador de cuerda, trino de dos notas |
| **Amanecer** | Campanilleo suave que sube de volumen poco a poco |
| **Digital** | Pitido agudo y repetitivo, imposible de ignorar |
| **Campanas** | Repique corto y cálido |
| **Marimba** | Arpegio de madera, notas ascendentes |
| **Radar** | Pulso doble que se va acelerando |
| **Sónar** | Tono profundo con eco largo |
| **Sirena** | Barrido que sube y baja sin parar |
| **Goteo** | Pulsos cortos y espaciados, para despertar sin sobresalto |

#### ¿Y los tonos de mi móvil?

**No se pueden usar desde el navegador.** Los tonos de fábrica de Android están en una
carpeta protegida del sistema a la que ninguna página web tiene acceso: solo las
aplicaciones nativas pueden leerlos. Por eso la aplicación trae sus propios nueve.

Si quieres despertarte con un audio tuyo, usa el apartado **Canción**, que sí permite
elegir un archivo de tu móvil o de tu ordenador. Y en la versión Android de la Fase 10 esto
deja de ser un problema: al no ser ya una página web, la aplicación puede pedirle al
sistema la lista completa de tonos de alarma, timbres y notificaciones del móvil.

### 7.2 Canción

Un archivo de audio de tu dispositivo, con tres botones:

- **Elegir** — abre el selector de archivos del sistema. Cualquier formato de audio que tu
  navegador sepa reproducir vale.
- **Escuchar** — lo reproduce entero, para comprobar que es el que quieres.
- **Quitar** — deja el favorito sin canción; las alarmas que ya la tuvieran puesta caerán al
  tono la próxima vez que suenen.

El archivo se guarda **en el propio dispositivo** (no se sube a ningún sitio), y queda
disponible aunque cierres y vuelvas a abrir la aplicación. Cada alarma puede tener su
propia canción, distinta de esta favorita —se elige igual, desde el editor de esa alarma—.

### 7.3 Emisora de radio

La emisora que sonará **en directo** al saltar la alarma. La lista se abre y se elige
igual que la de tonos —**Emisora elegida** siempre visible, **Explorar emisoras** para
desplegar el resto—, y suena en cuanto la seleccionas, para comprobarla antes de guardar.

| Emisora | Qué se oye |
|---|---|
| **LOS40** | Éxitos y música actual |
| **LOS40 Classic** | Los grandes éxitos de siempre |
| **LOS40 Dance** | Dance, house y electrónica |
| **Cadena Dial** | Música en español |
| **Cadena Dial Latino** | Latina, urbana y reguetón |
| **Hit FM** | Dance y música de club |
| **Flaix FM** | Éxitos, en catalán |

Al final de la lista hay una opción **Personalizada**: escribe el **nombre** y la **URL**
del stream de cualquier otra emisora, y pulsa **Probar** para comprobar que suena antes de
guardarla. Tiene que empezar por `https://` para que también funcione una vez publicada la
aplicación —los navegadores bloquean los streams `http://` sin cifrar en una página
`https://`—.

Si el día de la alarma la emisora no responde (cambió de proveedor, cerró el stream…), la
alarma **cae automáticamente al tono**: nunca se queda en silencio por eso.

### 7.4 Guardar y volver

Al pie de la pantalla hay dos botones:

- **Guardar cambios** — guarda tu elección y **te devuelve a la pantalla principal**, con
  un aviso de confirmación. Mientras tengas algo pendiente de guardar, el botón se rodea de
  un borde amarillo.
- **Volver atrás** — regresa a la pantalla principal sin guardar. Si tenías cambios
  pendientes, se descartan y te avisa de ello.

> Si el navegador tuviera el almacenamiento bloqueado y no se pudiera guardar, la
> aplicación **no** te lleva al inicio: se queda en la pantalla y te avisa del error, para
> que no te vayas pensando que tus cambios están a salvo.

Lo que guardes se mantiene al cerrar y volver a abrir la aplicación.

---

## 8. Cronómetro

Pulsa **Crono** en la barra inferior. Cuenta el tiempo hacia arriba, con centésimas de
segundo.

- **Iniciar** — arranca el cronómetro; el botón pasa a decir **Pausar**.
- **Pausar** — lo detiene sin perder lo acumulado; puedes seguir con **Iniciar**.
- **Reiniciar** — lo pone a cero. Solo funciona en pausa: si está corriendo, primero hay
  que pararlo, para no perder el tiempo por un toque sin querer.

Sigue corriendo aunque cambies a otra pantalla: al volver a **Crono**, muestra el tiempo
real transcurrido, no el que tenía la última vez que lo viste.

---

## 9. Cuenta atrás

Pulsa **Cuenta atrás** en la barra inferior. Al abrirla —o tras reiniciarla— se ven tres
contadores con botones **−** y **+** para fijar **horas**, **minutos** y **segundos** de
partida.

- **Iniciar** — arranca la cuenta con esa duración; los contadores se ocultan y aparece el
  reloj grande bajando. El botón pasa a decir **Pausar**.
- **Pausar** — la congela sin perder lo que queda; **Iniciar** la retoma donde se dejó.
- **Reiniciar** — cancela la cuenta en marcha y vuelve a los contadores, listos para fijar
  una duración nueva.

Al llegar a cero suena y vibra igual que una alarma —con el tono que tengas puesto en
Opciones de sonido—, con su propio aviso a pantalla completa: *¡Tiempo!*, con un único
botón, **Detener**. Un temporizador no tiene «posponer» ni «se ha perdido»: al pulsar
Detener, queda listo para volver a arrancar con la misma duración de antes.

Igual que el cronómetro, sigue corriendo aunque cambies de pantalla mientras tanto.

---

## 10. Modo día y modo noche

Pulsa el botón redondo de la esquina superior derecha:

- Con la **luna** visible, estás en modo día. Al pulsar, pasa a modo noche.
- Con el **sol** visible, estás en modo noche. Al pulsar, vuelve a modo día.

Tu elección **se recuerda** para las siguientes veces que abras la aplicación.

Mientras no pulses el botón ninguna vez, la aplicación sigue automáticamente el tema del
sistema: si cambias tu móvil u ordenador a modo oscuro, RadioAlarm se oscurece al momento.
En cuanto eliges un tema a mano, manda tu elección y deja de seguir al sistema.

---

## 11. Dónde se guardan tus datos

Todo lo que configuras —alarmas, favoritos de sonido y modo día/noche— se guarda **en el
propio dispositivo**, no en ningún servidor: nadie más que tú lo ve, y no depende de tener
conexión para funcionar. Consecuencias prácticas:

- **No se sincroniza entre dispositivos.** Las alarmas que crees en el móvil no aparecen en
  el ordenador, y al contrario.
- **Cada navegador tiene sus datos.** Si abres la aplicación en Chrome y en Safari, cada uno
  lleva sus propias alarmas.
- **Instalada, es más difícil que se pierdan por accidente.** Una vez añadida a la pantalla
  de inicio (apartado 2), sus datos ya no se ven afectados por limpiar la caché o el
  historial del navegador —solo por desinstalar la aplicación, o borrar a mano los datos de
  sitios web—.

---

## 12. Cosas a tener en cuenta

- **La aplicación necesita estar abierta o instalada para que la alarma suene.** No existe
  ninguna garantía de que un móvil bloqueado del todo, con la aplicación cerrada, la
  despierte por su cuenta: los navegadores no ofrecen esa posibilidad a una página web.
  Instalarla ayuda, pero no es infalible en todos los dispositivos. La versión de la Fase 10
  resolverá esto de verdad.
- **En iPhone la fiabilidad es más baja** que en Android: Safari suspende las aplicaciones
  en segundo plano de forma más agresiva.
- **La primera vez que abras la aplicación, toca algo en la pantalla** —cualquier botón,
  no tiene que ser uno de sonido— antes de dejarla esperando una alarma. Los navegadores
  bloquean el audio hasta que hay una interacción, y ese gesto lo desbloquea para el resto
  de la sesión.
- **Un pospuesto, el cronómetro o la cuenta atrás se pierden si recargas la página** a media
  marcha: viven en la memoria de esa sesión, no se guardan. La propia alarma, en cambio,
  nunca se pierde: seguirá sonando en su próxima ocasión normal.
- **Una emisora puede dejar de funcionar con el tiempo.** Cae al tono automáticamente si
  pasa, y siempre puedes escribir la URL nueva o la de otra en el apartado «Personalizada».

---

## 13. Qué falta por hacer

| Fase | Qué añadirá |
|---|---|
| 10 | Versión Android nativa: la alarma suena con el móvil bloqueado, y da acceso a los tonos de fábrica del sistema |
