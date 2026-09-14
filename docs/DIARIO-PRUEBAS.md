# Diario de pruebas — alarma nativa (Fase 10)

Registro acumulado de las pruebas de disparo de la alarma en un móvil real. La
Fase 10 no se puede probar en emulador ni con `npm test`: el punto entero es cómo
se comporta Android —y sobre todo ColorOS— con la app cerrada y el móvil
bloqueado, y eso solo se ve en el dispositivo.

> **Dos registros distintos, no confundirlos:**
>
> - **El registro interno** (`Registro.java`): las líneas que
>   `AlarmSchedulerPlugin`, `AlarmReceiver` y `AlarmService` van dejando en
>   `SharedPreferences` durante **el último disparo**. Guarda 80 líneas, se
>   sobrescribe en cada prueba y no sabe qué versión del código corría. Es la
>   fuente de datos en crudo. No se enseña por ninguna pantalla —es para
>   depurar, no para el usuario—; se saca de fuera:
>
>   ```bash
>   adb shell run-as com.javiroma1984.radioalarm cat /data/data/com.javiroma1984.radioalarm/shared_prefs/radioalarm-registro.xml
>   ```
>
> - **Este archivo** es el diario: una entrada por sesión de pruebas, con el
>   commit probado, el escenario, lo que dijo el registro interno y la
>   conclusión. No se borra nunca.

---

## Los cuatro escenarios

Una alarma nativa tiene que sonar —y encender la pantalla, y abrir el aviso de
sonando— en los cuatro casos. Van de más fácil a más difícil:

| # | Escenario | Qué lo hace sonar |
|---|---|---|
| A | App abierta y en primer plano | El motor JS (`motor/motor.js`), como en el navegador |
| B | App abierta pero en segundo plano, pantalla encendida | El motor JS sigue corriendo; `nativo.js` reprograma AlarmManager por si acaso |
| C | App abierta en segundo plano + móvil bloqueado a mano | `encenderPantalla` (wake lock) + el motor JS, o la alarma nativa si el proceso murió |
| D | **App cerrada del todo (deslizada de recientes) + móvil bloqueado** | Solo la cadena nativa: `AlarmManager` → `AlarmReceiver` → `AlarmService` (sonido propio con MediaPlayer) + notificación de pantalla completa |

El escenario **D es el que da problemas** y el motivo de existir de toda la
cadena nativa. A y B se dan por buenos desde la Fase 6.

---

## Cómo hacer una sesión de pruebas

1. **Compilar e instalar** (con el móvil conectado):

   ```bash
   npm run build:www && npx cap sync android
   ```

   Y después, desde `android/`, con Gradle (ver la nota de abajo sobre por qué
   no se usa `gradlew` en esta máquina):

   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
   $env:GRADLE_OPTS = "-Djavax.net.ssl.trustStore=$env:USERPROFILE\.gradle\cacerts-avg -Djavax.net.ssl.trustStorePassword=changeit"
   & "$env:USERPROFILE\.gradle\local-dists\gradle-8.14.3\bin\gradle.bat" assembleDebug --no-daemon
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\RadioAlarm.apk
   ```

   > **Por qué no `gradlew` ni el JDK de siempre**, resuelto el 2026-09-14:
   >
   > - **AVG Antivirus inspecciona el tráfico TLS** con su propia CA raíz
   >   (`AVG Web/Mail Shield Root`). Windows confía en ella, pero Java no, así
   >   que cualquier descarga de Gradle muere con `PKIX path building failed`.
   >   Arreglado con una copia de `cacerts` en `~/.gradle/cacerts-avg` que
   >   incluye esa CA — no se tocó la instalación del JDK.
   > - **El wrapper aborta igualmente**: su timeout de lectura es de 10 s y
   >   AVG, escaneando un zip de 130 MB, no da ese ritmo. Por eso Gradle
   >   8.14.3 está descargado a mano en `~/.gradle/local-dists/` y se invoca
   >   directo.
   > - **El JDK de Android Studio (el primero) está roto**: le falta
   >   `jbr\lib\jvm.cfg`. El bueno es el de `Android Studio1` (JBR 21). Hay
   >   también un `jdk-17` en `C:\Program Files\Java`, pero sus certificados
   >   son de 2024 y dan más guerra.
   > - `--no-daemon` no es capricho: hace que el almacén de certificados de
   >   `GRADLE_OPTS` valga también para bajar dependencias, no solo para
   >   arrancar.

2. **Conceder los permisos** desde la propia app: vista Sonido → botón único de
   permisos. Son cuatro y hacen falta los cuatro para el escenario D:
   alarmas exactas, notificaciones, pantalla completa y exención de batería.
   En ColorOS, además, el **autoarranque** desde el atajo que abre la app
   (no hay forma de comprobarlo por código).

3. **Programar una alarma** a 2–3 minutos vista, con la fuente de sonido que se
   quiera probar (tono / canción / radio).

4. **Montar el escenario** (A, B, C o D) y esperar a que llegue la hora.

5. **Anotar el resultado.** Saca el registro interno con el `adb shell run-as`
   de arriba y pega el texto en la entrada del diario. `adb logcat -d -s
   RadioAlarm` trae lo mismo mientras el buffer no haya rotado, y además el
   contexto de Android alrededor (bloqueos de actividad, foco de audio, muertes
   de proceso), que suele ser justo lo que falta.

6. **Borrar el registro** antes de la siguiente prueba, para no mezclar cadenas:

   ```bash
   adb shell run-as com.javiroma1984.radioalarm rm -f /data/data/com.javiroma1984.radioalarm/shared_prefs/radioalarm-registro.xml
   ```

---

## Plantilla de entrada

```
### AAAA-MM-DD — <título corto>

- **Commit probado:** <hash> "<asunto>"
- **Móvil:** Oppo A78 5G, ColorOS <versión>, Android <versión>
- **Permisos concedidos:** exactas ☐  notificaciones ☐  pantalla completa ☐  batería ☐  autoarranque ColorOS ☐
- **Escenario:** <A / B / C / D>
- **Fuente de sonido:** <tono X / canción / radio Y>

**Qué pasó:**
<sonó / no sonó · encendió pantalla / no · abrió el aviso de sonando / no · cuánto tardó>

**Panel de Diagnóstico:**
```
<pegar aquí el texto del registro>
```

**Conclusión / siguiente paso:**
<qué falla y en qué eslabón, o qué se cambia a continuación>
```

---

## Historial

### 2026-09-14 (21:58–22:01) — Escenario B resuelto: **la matriz queda completa**

- **Escenario:** B — app cerrada, pantalla encendida sin bloquear
- **Resultado:** **la pantalla de alarma se abre en las tres fuentes** (tono,
  canción y radio), confirmado por el usuario.

El registro y el logcat lo respaldan:

```
superposición=true          en los cuatro disparos
SYSTEM_ALERT_WINDOW: allow
Bloqueos de BAL: NINGUNO
```

Con el permiso de superposición concedido, el `startActivity` de `AlarmService`
deja de ser bloqueado y la pantalla de alarma se abre también con el móvil
desbloqueado.

**Matriz final — los 3 sonidos en los 4 escenarios:**

|  | Tono | Canción | Radio |
|---|---|---|---|
| **A** — app abierta, desbloqueado | ✅ | ✅ | ✅ |
| **B** — app cerrada, desbloqueado | ✅ | ✅ | ✅ |
| **C** — app abierta, bloqueado | ⚠️ (1) | ✅ | ✅ |
| **D** — app cerrada, bloqueado | ✅ | ✅ | ✅ |

(1) No es un fallo: ColorOS mata la app en cuanto se bloquea la pantalla, así
que los intentos de probar el tono en C acabaron siendo D. Con la app viva el
tono entra por el mismo camino nativo que en A y D, ya probados.

**Cambio posterior:** se quita el botón «Descartar» de la notificación. Existía
como red de seguridad de cuando la pantalla de alarma no se abría de forma
fiable; ahora que se abre en los cuatro escenarios, ofrecer dos formas de parar
la misma alarma solo duplica la interfaz. La notificación se queda —todo
servicio en primer plano necesita una, y es la que lleva el
`setFullScreenIntent`—, pero ya solo informa.

### 2026-09-14 (21:50–21:52) — Escenario B: **la pantalla de alarma no se abre con el móvil desbloqueado**

- **Escenario:** B — app cerrada de recientes, **pantalla encendida y sin bloquear**
- **Resultado:** las tres fuentes suenan, pero **ninguna abre la pantalla de
  alarma**: solo sale la notificación flotante de la barra de arriba.

**Causa, dicha por el propio Android en logcat:**

```
E/ActivityTaskManager: Background activity launch blocked! [callingPackage: com.javiroma1984.radioalarm;
  callingUidHasAnyVisibleWindow: false; callingUidProcState: FOREGROUND_SERVICE;
  isPendingIntent: false; autoOptInReason: notPendingIntent; ...]
E/ActivityTaskManager: Abort background activity starts from 10457
```

Con la pantalla **bloqueada** la alarma se abre porque manda la notificación de
pantalla completa: la abre el propio sistema. **Desbloqueado**, Android la
degrada a notificación flotante —es su comportamiento documentado cuando el
dispositivo está en uso— y entonces el único camino que queda es el
`startActivity` de `AlarmService`, que choca con las restricciones de arranque
de actividades en segundo plano.

**Y el registro interno mentía:** decía `AlarmService: startActivity OK` en las
tres. `startActivity` **no lanza excepción cuando el sistema lo bloquea**, así
que desde Java parecía que había ido bien. Era el falso positivo que ya se
sospechaba en las notas de partida de este diario, ahora confirmado.

**Arreglo aplicado (pendiente de probar):** se añade el permiso
**«Mostrar sobre otras aplicaciones»** (`SYSTEM_ALERT_WINDOW`), que es una de
las exenciones oficiales de la restricción de BAL. Es el compañero de
«Pantalla completa»: uno cubre el móvil bloqueado y el otro el desbloqueado, y
hacen falta los dos para que la pantalla de alarma salga siempre. Entra en el
mismo flujo de permisos que los demás, en `sonido.js`.

Además, el registro pasa a decir `startActivity lanzado` en vez de
`startActivity OK`, y añade el estado del permiso de superposición tanto al
programar como al disparar —para que un log futuro se pueda leer sin volver a
caer en el mismo engaño—.

### 2026-09-14 (21:33–21:42) — Matriz completa: **los 3 sonidos en los 3 escenarios, todo correcto**

- **Commit probado:** `loLlevaElNativo` + pausa entre repeticiones (sin commitear aún)

| Escenario | Tono | Canción | Radio |
|---|---|---|---|
| **A** — app abierta, desbloqueado | ✅ 21:40 | ✅ 21:41 | ✅ 21:42 |
| **C** — app abierta, bloqueado | ⚠️ ver abajo | ✅ 21:34 | ✅ 21:35 |
| **D** — app cerrada, bloqueado | ✅ 21:33, 21:36 | ✅ 21:26 | ✅ 21:27 |

En las tres de A no aparece `comprobarLanzamiento`: el JS no rearrancó, la app
estaba viva de verdad. En las de C, canción y radio pillaron el proceso vivo
(pid 8137).

**ColorOS mata la app con la pantalla bloqueada.** Los dos intentos de probar
el tono en escenario C acabaron siendo D: el log dice `Start proc ... for
broadcast {AlarmReceiver}`, o sea que Android arrancó el proceso de cero para
entregar la alarma. No es un fallo —es la mejor justificación posible de toda
la cadena nativa: si la alarma dependiera del JS, en este móvil no sonaría—,
pero deja la casilla «tono en C» sin probar. Riesgo bajo: con la app viva el
tono entra por el mismo camino nativo que en A y en D, que ya está probado.

**El tono suena siempre por el nativo, en los tres escenarios**, incluso con la
app abierta y en primer plano: `handleOnNewIntent` entrega el id antes de que
el `tick()` del JS detecte la alarma por su cuenta, así que siempre entra por
`desdeNativo: true`. Es lo deseable —el camino nativo es el fiable—, pero tiene
una consecuencia que conviene recordar: **en Android el ritmo del tono lo manda
el WAV**, no `PAUSA_ENTRE_CICLOS` de `sintetizador.js`, que solo gobierna la
web/PWA y la cuenta atrás. Los dos valen 1 s; si cambia uno, hay que cambiar el
otro.

**Pausa entre repeticiones, comprobada sobre el APK instalado en el móvil**
(extrayendo `res/raw/tono_clasico.wav` y midiéndolo, sin depender del oído):
2,25 s de ciclo = **1,03 s de trino + 1,22 s de silencio**. El silencio sale
1,22 s y no 1,00 s clavado porque el patrón del clásico ya arrastraba 0,2 s de
cola propia tras el último golpe.

### 2026-09-14 (21:25–21:27) — Verificación del arreglo del tono: **los tres sonidos correctos**

- **Commit probado:** arreglo de `loLlevaElNativo` (sin commitear aún)
- **Escenario:** D — app cerrada, pantalla bloqueada

**Pantalla bloqueada: confirmada en las tres**, por logcat. Las tres despiertan
igual, y la despierta la propia notificación de la alarma:

```
21:25:00  Waking up from Asleep ... details=com.android.systemui:full_screen_intent
21:26:00  Waking up from Asleep ... details=com.android.systemui:full_screen_intent
21:27:00  Waking up from Asleep ... details=com.android.systemui:full_screen_intent
```

`from Asleep` = la pantalla estaba apagada. Entre prueba y prueba se ve el
`Going to sleep due to power_button`.

**App cerrada:** canción (21:26) y radio (21:27) con `Start proc ... for
broadcast {AlarmReceiver}`, o sea proceso arrancado de cero: escenario D puro.
En la del tono (21:25) el proceso seguía vivo (ColorOS lo mantuvo; no murió
hasta las 21:25:20), pero la actividad y el WebView sí se habían destruido y se
recrearon —arranque nuevo de JS, proceso nuevo de WebView—, que son las
condiciones que rompían el tono. Vale como prueba, aunque no fue tan en frío
como las otras dos.

**El relevo, que es lo que se estaba arreglando:**

| Fuente | `detenido` en el registro | Lectura |
|---|---|---|
| Tono | uno solo, a los 7 s | No hubo relevo: el nativo se quedó el sonido hasta que se pulsó Descartar ✅ |
| Canción | dos: a los 2 s y a los 6 s | Relevo al JS + Descartar, lo esperado ✅ |
| Radio | dos: a los 2 s y a los 12 s | Igual ✅ |

**Confirmado por el usuario:** el tono se repite. La canción no se dejó llegar
al final del bucle (dura minutos, el bucle casi no aplica). La radio no se
repite **por diseño**: es un directo, suena de forma continua hasta pararla
—`AlarmService` le pone `setLooping(false)` justo por eso—.

**Pega encontrada y corregida:** el tono se repetía **demasiado seguido**. El
WAV era exactamente un ciclo del patrón y `setLooping(true)` lo encadena sin
hueco, así que el clásico sonaba cada 1,25 s, sin respirar. Se añade **1 s de
silencio entre repeticiones**, en los dos sitios a la vez y con el mismo valor:
`PAUSA_ENTRE_CICLOS` en `sintetizador.js` (para el bucle de Web Audio con la app
abierta) y en `tools/generar-tonos.mjs`, que lo graba como cola de silencio en
el WAV (para el bucle nativo con la app cerrada). Tonos regenerados: el clásico
pasa de 1,25 s a 2,25 s por vuelta.

### 2026-09-14 (noche) — Escenario D en los tres sonidos: **la pantalla de sonando ya sale siempre**

- **Commit probado:** el arreglo de `idPendiente` + `retainUntilConsumed` (sin commitear aún)
- **Escenario:** D — app cerrada de recientes, pantalla bloqueada
- **Resultado por fuente:**

| Fuente | Pantalla amarilla | Vibra | Suena |
|---|---|---|---|
| Tono | ✅ | ✅ | ⚠️ **suena una sola vez, no se repite** |
| Canción | ✅ | ✅ | ✅ |
| Radio | ✅ | ✅ | ✅ |

El registro lo confirma: aparece por primera vez la línea
`comprobarLanzamiento: la app arrancó por la alarma id=...`, que es
exactamente el camino que el arreglo abrió. **El bug de la pantalla está
resuelto.**

**El tono, en cambio, suena una vez y calla.** Causa:

`avanzarCola()` llamaba a `detenerSonidoNativo()` y pasaba el relevo al JS en
todos los casos. Para canción y emisora eso va bien —`reproductor.js` usa un
elemento `<audio>`, que el WebView deja arrancar sin gesto previo; se ve en el
logcat el `requestAudioFocus() ... AA=USAGE_MEDIA` del Chromium—. Pero el tono
lo sintetiza `sintetizador.js` con **Web Audio**, y un `AudioContext` no
arranca sin un gesto del usuario. En el escenario D ese gesto no ha existido
nunca: la app la abrió la alarma, nadie ha tocado la pantalla.
`asegurarContexto()` llama a `resume()` pero ni lo espera ni sirve de nada sin
gesto, así que el bucle de `sonarAlarmaTono` iba programando notas sobre un
reloj congelado. Lo único que se oía era el primer trozo del WAV nativo, justo
hasta que el JS lo mandaba parar un segundo después.

**Arreglo aplicado (pendiente de probar):** un tono lanzado por el nativo se
queda sonando **en el nativo**. `AlarmService` ya lo reproduce en bucle, por el
canal de alarma y con su rampa, así que no tiene sentido quitárselo para
dárselo a un Web Audio que no puede sonar. El JS sigue llevando la pantalla,
el posponer y el descartar; solo deja de llevar ese sonido en concreto.
`terminarDeSonar` pasa a parar también el nativo, que ahora puede seguir vivo
al llegar ahí.

Un pospuesto no necesita nada de esto: para llegar a él hay que pulsar
«Posponer», y ese toque ya desbloquea el audio para el resto de la sesión.

**También:** se quitó el panel de Diagnóstico de la pantalla de Sonido. El
registro sigue guardándose igual, pero se saca por `adb` (ver arriba): es una
herramienta de depuración, no algo que el usuario deba ver.

### 2026-09-14 — Escenario D con canción: **suena, pero no sale la pantalla de sonando**

- **Commit probado:** `5273218`
- **Móvil:** Oppo A78 5G (CPH2483)
- **Permisos:** exactas ✅ notificaciones ✅ pantalla completa ✅ batería ✅ (todos
  comprobados por `adb`, no de oídas)
- **Escenario:** D — app cerrada, pantalla bloqueada
- **Fuente de sonido:** canción

**Qué pasó:** la alarma **sonó** (por primera vez en este escenario) y la app se
abrió sola, pero **abrió en la lista de alarmas, no en la pantalla de sonando**,
así que no había botón de parar. El sonido siguió 33 s hasta que se paró a mano.

**Panel de Diagnóstico:**

```
[14/09 20:39:51] programar id=09bc1c47 cuando=Mon Sep 14 20:41:00 tipo=cancion (alarmas exactas=true, exención batería=true, pantalla completa=true)
[14/09 20:41:00] AlarmReceiver.onReceive id=09bc1c47
[14/09 20:41:00] AlarmReceiver: AlarmService arrancado
[14/09 20:41:00] AlarmService.onStartCommand id=09bc1c47 tipo=cancion (exención batería=true, pantalla completa=true)
[14/09 20:41:00] AlarmService: startForeground OK
[14/09 20:41:00] AlarmService: startActivity OK
[14/09 20:41:01] handleOnNewIntent: alarma relanzada con la app abierta id=09bc1c47
[14/09 20:41:01] AlarmService: reproducción en marcha
[14/09 20:41:02] programar id=09bc1c47 cuando=Tue Sep 15 20:41:00 tipo=cancion
[14/09 20:41:33] AlarmService: detenido (botón Descartar o JS)
```

**Conclusión — causa raíz encontrada:**

`AlarmService` abre la app por **dos caminos a la vez**: su `startActivity`
directo y el `setFullScreenIntent` de la notificación. El primero crea la
actividad y su JS empieza a cargar; el segundo llega un instante después como
`onNewIntent`. Se ve en el log: `handleOnNewIntent` a las 20:41:01, y el JS
todavía arrancando a las 20:41:02 (la línea `programar` de su
`resincronizar()` inicial).

Ese `handleOnNewIntent` **perdía el id por los dos lados a la vez**:

1. Emitía el evento `alarmaLanzada` cuando el JS aún no había registrado su
   oyente —`iniciarNativo()` es lo último de `app.js`, y su `addListener` lo
   último de `nativo.js`—, y Capacitor descarta los eventos sin oyentes.
2. Hacía `intent.removeExtra("idAlarma")`, borrando el dato de respaldo que
   `comprobarLanzamiento()` iba a leer un segundo después.

Sin id, el JS no tenía ninguna alarma que activar y pintaba la lista normal.
Es el mismo síntoma que el commit `5273218` trató por encima (permitir
silenciar desde el interruptor del listado) sin llegar a la causa.

**Arreglo aplicado (pendiente de probar):**

- `AlarmSchedulerPlugin`: `handleOnNewIntent` guarda el id en `idPendiente`
  (con una validez de 60 s para que no resucite una alarma ya descartada) y
  emite el evento con `retainUntilConsumed=true`, para que sobreviva a que el
  oyente se registre después. `comprobarLanzamiento` mira ese pendiente antes
  que el extra del intent.
- `motor.js`: `activarAlarmaNativa` pasa a ser idempotente —el id puede llegar
  ahora por los dos caminos, y encolarla dos veces la haría sonar dos veces—.

### 2026-09-11 — Tandas rápidas de tono/canción/radio (reconstruida del registro, NO es la prueba D)

- **Commit probado:** `5273218` (el instalado el 2026-09-09, idéntico al HEAD de ese día)
- **Móvil:** Oppo A78 5G (CPH2483), ColorOS, Android (targetSdk 36 en la app)
- **Escenario:** app abierta todo el rato (probablemente editando la alarma y
  guardando cada minuto) — **no D**. Lo confirma el registro: las 8 veces que
  saltó la alarma, el aviso llegó por `handleOnNewIntent` (proceso ya vivo). La
  línea `comprobarLanzamiento` (arranque en frío de verdad) no aparece ni una
  vez.

**8 disparos, 23:02–23:08:**

| Hora | Tipo | Cadena nativa hasta `startActivity` | `reproducción en marcha` |
|---|---|---|---|
| 23:02:00 | canción | OK | ❌ (parado antes de sonar) |
| 23:03:00 | radio | OK | ❌ (parado antes de sonar) |
| 23:04:00 | tono | OK | ✅ |
| 23:05:00 | radio | OK | ❌ (parado antes de sonar) |
| 23:06:00 | radio | OK | ❌ (parado antes de sonar) |
| 23:07:00 | canción | OK | ✅ |
| 23:08:01 | canción | OK | ✅ |

**Conclusión / siguiente paso:**

- La cadena `AlarmReceiver` → `AlarmService` → `startForeground` → `startActivity`
  funciona 8/8 con la app viva. Eso no prueba nada nuevo (ya funcionaba desde
  antes de la Fase 10).
- **Ninguna de las 3 pruebas de radio llegó a `reproducción en marcha`**: el JS
  siempre ganó la carrera y mandó parar el servicio nativo antes de que el
  stream terminara de conectar. Con la app abierta es el comportamiento
  esperado, pero deja **sin probar si la radio suena de verdad solo con el
  servicio nativo** (el caso que importa en D, donde no hay JS que la
  sustituya).
- **Falta por completo la prueba del escenario D** (app cerrada del todo desde
  recientes + pantalla bloqueada). Nada en el registro desde el 2026-09-11
  23:08, y el proceso no está corriendo el 2026-09-14 a la hora de revisar
  esto. Es la prueba pendiente antes de poder decir si lo que se recordaba
  roto ("no suena con el móvil bloqueado y la app cerrada") sigue así o no.

### Estado de partida (reconstruido del historial de git + lectura de código, SIN prueba nueva confirmada)

Al asumir el proyecto el 2026-09-09, en el commit `5273218`. Todavía **no se ha
hecho una sesión de pruebas formal** con este diario; esto es lo que se deduce:

- **Escenarios A y B:** funcionan desde la Fase 6. El motor JS detecta la alarma
  y suena.
- **Escenario D (app cerrada + bloqueado):** el usuario recuerda que **no
  sonaba**. Ese recuerdo es probablemente anterior a la tanda de commits
  `41425ee` → `9528a37` → `c20d143` → `2e8c998` (del 2026-08), que son
  justamente los que hacen que **`AlarmService` reproduzca el sonido él mismo con
  `MediaPlayer`**, sin depender de que la WebView llegue a arrancar. Antes de
  eso, en el escenario D no había nada que sonara si la actividad no se abría —y
  no se abre, porque `startActivity` desde un servicio está bloqueado por
  Android 10+ (BAL) y solo la notificación de pantalla completa puede traerla—.
- **Por tanto:** hay que **volver a probar el escenario D** con el código actual
  antes de dar nada por roto. La hipótesis es que **ahora sí suena** (el
  servicio), pero que puede seguir **sin encender la pantalla ni abrir el aviso
  de sonando** si el permiso de pantalla completa no está realmente concedido
  o si ColorOS bloquea la notificación de pantalla completa.

### Eslabones donde la cadena D se puede seguir rompiendo (revisión de código, por confirmar en el móvil)

1. **ColorOS mata el proceso antes de la hora.** Si la exención de batería o el
   autoarranque no están los dos puestos, el `PendingIntent` de `setAlarmClock`
   puede no llegar a dispararse, o `AlarmReceiver` dispararse pero
   `startForegroundService` lanzar `ForegroundServiceStartNotAllowedException`.
   → En el Diagnóstico se vería `AlarmReceiver: FALLÓ al arrancar AlarmService`
   o directamente **ninguna línea de `AlarmReceiver.onReceive`**.

2. **`startActivity` desde `AlarmService` NO abre la actividad** en Android 10+
   con la app en segundo plano (restricción de *background activity launch*).
   `startActivity` **no lanza excepción** cuando el sistema lo bloquea, así que
   el Diagnóstico dice `startActivity OK` aunque no haya pasado nada: esa línea
   da un falso positivo. El único camino real para abrir el aviso en el
   escenario D es el `setFullScreenIntent` de la notificación.

3. **La notificación de pantalla completa degrada a notificación normal** si
   `USE_FULL_SCREEN_INTENT` no está efectivamente concedido. En Android 14+ ese
   permiso se auto-revoca para apps que Google no considera "de alarma/llamada";
   una app instalada de lado puede necesitar concederlo a mano
   (`solicitarPermisoPantallaCompleta` abre esos ajustes). Sin él: suena el
   servicio, pero la pantalla no se enciende y el aviso no aparece hasta que el
   usuario desbloquea y toca la notificación.
   → En el Diagnóstico se vería `pantalla completa=false` en la línea de
   `AlarmService.onStartCommand`.

4. **`targetSdk 36`** (Android 16) activa todas las restricciones nuevas de
   servicios en segundo plano y alarmas exactas. Merece la pena comprobar si
   conviene `USE_EXACT_ALARM` (auto-concedido a apps de despertador) en vez de
   `SCHEDULE_EXACT_ALARM` (concesión manual), que es lo que hay ahora.

5. **El sonido del servicio y el del JS se pueden solapar** si la app llega a
   abrirse tarde: el JS llama a `detenerSonidoNativo()` al sonar, pero si hay
   una ventana entre que el servicio arranca el `MediaPlayer` y el JS toma el
   control, se oyen los dos un instante.
