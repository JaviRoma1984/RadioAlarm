# Manual de RadioAlarm

Este manual crece con cada fase del proyecto. Ahora mismo cubre las **fases 1 a 4** de 10.

---

## 1. Abrir la aplicación

Con Apache arrancado en XAMPP, entra en:

<http://localhost/RadioAlarm/>

Si la dirección da error 404, falta la unión de directorio en `htdocs`. Se crea una única
vez con:

```bash
cmd /c mklink /J "C:\xampp\htdocs\RadioAlarm" "C:\Users\j-f-r\Documents\DEV\Repositorios\RadioAlarm"
```

---

## 2. Partes de la pantalla

**Cabecera.** El nombre de la aplicación y, a la derecha, el botón de cambio de tema.

**Zona central.** El listado de tus alarmas. Mientras no tengas ninguna, muestra un mensaje
de bienvenida.

**Botón flotante «Crear».** El círculo turquesa con el signo **+**, centrado justo encima
de la barra inferior. Es la acción principal: crear una alarma nueva.

**Barra inferior.** Las tres acciones secundarias:

| Botón | Icono | Para qué sirve |
|---|---|---|
| **Crono** | Cronómetro | Medir tiempo hacia adelante |
| **Cuenta atrás** | Reloj de arena | Temporizador que avisa al llegar a cero |
| **Sonido** | Altavoz | Abrir las opciones de sonido |

**Crono** y **Cuenta atrás** todavía no hacen nada: al pulsarlos aparece un aviso
indicando en qué fase estarán disponibles. **Sonido** ya funciona.

---

## 3. Tus alarmas

### Crear una alarma

Pulsa el botón **+**. Se abre el editor con la hora en punto siguiente a la actual ya
puesta —si son las 15:20, empieza en 16:00— y el resto de opciones con sus valores
habituales, listas para cambiar antes de guardar.

### Qué muestra cada alarma

| Elemento | Qué es |
|---|---|
| **Hora grande** | A qué hora suena |
| **Nombre** | El nombre que le has puesto |
| **Línea gris** | Cada cuánto se repite y con qué va a sonar. Por ejemplo *De lunes a viernes · Tono Clásico* |
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

## 4. Editor de alarma

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

- **Tono** — la misma lista de nueve tonos de las opciones de sonido, con el mismo
  comportamiento: suena al elegirlo y se resalta en amarillo.
- **Canción** y **Radio** — todavía no se puede elegir el archivo ni la emisora; llega en
  la **Fase 5**. Si guardas con una de estas dos pestañas puesta, la alarma se guarda con el
  tono y te avisa de que la elección no se ha podido aplicar aún.

Al abrir una alarma nueva, el tono de partida es el que tengas marcado como favorito en
**Opciones de sonido** —lo configuras una vez y todas las alarmas nuevas parten de él—.
Cada alarma puede cambiarlo después sin que afecte a las demás.

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

## 5. Opciones de sonido

Pulsa **Sonido** en la barra inferior. La zona central cambia y muestra tres apartados.
El botón queda resaltado en turquesa mientras estás en esta pantalla.

### Tono

De entrada el apartado muestra solo tres cosas: la descripción, la línea **Tono elegido**
con el nombre del que tienes puesto, y el botón **Explorar tonos**.

Al pulsar **Explorar tonos** se despliega el listado completo de los nueve timbres. El
botón pasa a decir **Ocultar tonos** y la flecha gira, para que se vea de un vistazo si
está abierto o cerrado.

**Solo puede haber un tono seleccionado.** Al pulsar uno nuevo, el anterior se deselecciona
automáticamente, y no hay forma de quedarse sin ninguno: **Clásico** viene puesto de
fábrica y, si pulsas el que ya está marcado, sigue marcado. La línea **Tono elegido** se
actualiza al instante, así que puedes cerrar el listado y seguir viendo cuál tienes.

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
elegir un archivo de tu móvil o de tu ordenador.

Y en la versión Android de la Fase 10 esto deja de ser un problema: al no ser ya una página
web, la aplicación puede pedirle al sistema la lista completa de tonos de alarma, timbres y
notificaciones del móvil.

### Canción

Un archivo de audio de una carpeta tuya. El botón **Elegir** avisa de que llega en la
Fase 5, cuando se añada el selector de archivos.

### Emisora de radio

La emisora que sonará en directo al saltar la alarma. También llega en la Fase 5, con el
reproductor de streams.

### Guardar y volver

Al pie de la pantalla hay dos botones:

- **Guardar cambios** — guarda tu elección y **te devuelve a la pantalla principal**, con
  un aviso de confirmación indicando el tono elegido. Mientras tengas algo pendiente de
  guardar, el botón se rodea de un borde amarillo.
- **Volver atrás** — regresa a la pantalla principal sin guardar. Si tenías cambios
  pendientes, se descartan y te avisa de ello.

> Si el navegador tuviera el almacenamiento bloqueado y no se pudiera guardar, la
> aplicación **no** te lleva al inicio: se queda en la pantalla y te avisa del error, para
> que no te vayas pensando que tus cambios están a salvo.

Lo que guardes se mantiene al cerrar y volver a abrir la aplicación.

---

## 6. Modo día y modo noche

Pulsa el botón redondo de la esquina superior derecha:

- Con la **luna** visible, estás en modo día. Al pulsar, pasa a modo noche.
- Con el **sol** visible, estás en modo noche. Al pulsar, vuelve a modo día.

Tu elección **se recuerda** para las siguientes veces que abras la aplicación.

Mientras no pulses el botón ninguna vez, la aplicación sigue automáticamente el tema de
Windows: si cambias Windows a modo oscuro, RadioAlarm se oscurece al momento. En cuanto
eliges un tema a mano, manda tu elección y deja de seguir al sistema.

---

## 7. Dónde se guardan tus datos

Todo lo que configuras —alarmas, tono elegido y modo día/noche— se guarda **en el propio
navegador del dispositivo**, no en ningún servidor. Consecuencias prácticas:

- **No se sincroniza entre dispositivos.** Las alarmas que crees en el ordenador no
  aparecen en el móvil, y al contrario.
- **Cada navegador tiene sus datos.** Si abres la aplicación en Chrome y en Edge, cada uno
  lleva sus propias alarmas.
- **Se pierden si borras los datos de navegación** marcando *cookies y datos de sitios*.
  Borrar solo el historial o la caché no las toca.
- Cuando instales la aplicación en el móvil (Fase 8), pasará a usar el almacenamiento propio
  de la aplicación, que ya no se ve afectado por la limpieza del navegador.

---

## 8. Qué falta por hacer

| Fase | Qué añadirá |
|---|---|
| 2 | Guardado de las alarmas |
| 3 | Listado de alarmas en la pantalla principal |
| 4 | Pantalla para crear y editar alarmas |
| 5 | Tonos, canciones de tu carpeta y emisoras de radio |
| 6 | Que la alarma suene de verdad, con posponer y vibración |
| 7 | Cronómetro y temporizador de cuenta atrás |
| 8 | Instalarla en el móvil como aplicación |
| 9 | Publicarla en GitHub Pages |
| 10 | Versión Android que suena con el móvil bloqueado |
