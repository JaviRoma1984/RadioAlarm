# Manual de RadioAlarm

Este manual crece con cada fase del proyecto. Ahora mismo cubre la **Fase 1**.

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

**Zona central.** Aquí aparecerá el listado de tus alarmas. Mientras no tengas ninguna,
muestra un mensaje de bienvenida.

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

## 3. Opciones de sonido

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

## 4. Modo día y modo noche

Pulsa el botón redondo de la esquina superior derecha:

- Con la **luna** visible, estás en modo día. Al pulsar, pasa a modo noche.
- Con el **sol** visible, estás en modo noche. Al pulsar, vuelve a modo día.

Tu elección **se recuerda** para las siguientes veces que abras la aplicación.

Mientras no pulses el botón ninguna vez, la aplicación sigue automáticamente el tema de
Windows: si cambias Windows a modo oscuro, RadioAlarm se oscurece al momento. En cuanto
eliges un tema a mano, manda tu elección y deja de seguir al sistema.

---

## 5. Qué falta por hacer

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
