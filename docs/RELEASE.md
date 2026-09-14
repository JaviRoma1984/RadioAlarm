# Cómo publicar una release de RadioAlarm

Guía para sacar una versión instalable en
<https://github.com/JaviRoma1984/RadioAlarm/releases>.

El repositorio no guarda APK —están en `.gitignore`, y con razón: son
compilados, no código—, así que el APK viaja como **archivo adjunto de la
release**, que es justo para lo que existen.

---

## Antes de empezar: dos avisos

**1. El APK de release no se puede instalar encima del de depuración.** Los dos
van firmados con claves distintas, y Android se niega a sustituir uno por otro
(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Hay que desinstalar el de depuración
primero — **y eso borra las alarmas, los ajustes de sonido y la canción
exportada**. Apunta lo que tengas configurado antes de hacerlo.

**2. Una vez publicada una release firmada, esa clave es para siempre.** Si se
pierde el keystore, no se puede publicar ninguna actualización que Android
acepte instalar encima: habría que desinstalar y empezar de cero, perdiendo los
datos otra vez. Guarda una copia del `.jks` fuera del ordenador.

---

## 1. Decidir la versión

En [`android/app/build.gradle`](../android/app/build.gradle):

```gradle
versionCode 1
versionName "1.0"
```

- **`versionCode`** es un entero que Android usa para saber qué build es más
  nueva. **Sube de uno en uno en cada release, sin excepción.**
- **`versionName`** es lo que ve la persona («1.0», «1.1»…).

Para la primera release se pueden dejar como están: nunca se ha distribuido
ningún APK, así que no hay nada por encima de lo que actualizar.

## 2. Crear el keystore (solo la primera vez)

La clave con la que se firma la app. **Este paso lo tienes que hacer tú**: pide
contraseñas, y no deben pasar por ningún sitio que no seas tú.

```bash
& "$env:ProgramFiles\Android\Android Studio1\jbr\bin\keytool.exe" -genkeypair -v -keystore "$env:USERPROFILE\claves\radioalarm.jks" -keyalg RSA -keysize 2048 -validity 10000 -alias radioalarm
```

Te pedirá una contraseña para el keystore, otra para la clave y unos datos de
identidad (nombre, organización, país) que puedes rellenar como quieras.

Crea antes la carpeta si no existe, y **fuera del repositorio**:

```bash
New-Item -ItemType Directory -Force "$env:USERPROFILE\claves"
```

> `.gitignore` ya excluye `*.jks` y `*.keystore`, pero aun así el keystore no
> debe vivir dentro del proyecto: un `git add -f` despistado o un zip de la
> carpeta lo sacarían de ahí sin querer.

## 3. Configurar la firma

Crea `android/keystore.properties` con las rutas y contraseñas:

```properties
storeFile=C:/Users/j-f-r/claves/radioalarm.jks
storePassword=LA_QUE_PUSISTE
keyAlias=radioalarm
keyPassword=LA_QUE_PUSISTE
```

**Añádelo a `.gitignore` antes de nada**, o acabará subido a GitHub con las
contraseñas dentro:

```
android/keystore.properties
```

Y en `android/app/build.gradle`, dentro del bloque `android { }`:

```gradle
def propsFirma = new Properties()
def ficheroFirma = rootProject.file("keystore.properties")
if (ficheroFirma.exists()) propsFirma.load(new FileInputStream(ficheroFirma))

signingConfigs {
    release {
        if (propsFirma.containsKey("storeFile")) {
            storeFile file(propsFirma["storeFile"])
            storePassword propsFirma["storePassword"]
            keyAlias propsFirma["keyAlias"]
            keyPassword propsFirma["keyPassword"]
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

El `if` no es adorno: sin él, el proyecto no compila en una máquina que no
tenga el `keystore.properties` —por ejemplo, si alguien clona el repositorio—.

## 4. Compilar el APK de release

En esta máquina no se compila con `gradlew`; el porqué está en
[`DIARIO-PRUEBAS.md`](DIARIO-PRUEBAS.md) (AVG rompe el TLS de Java, el wrapper
hace timeout y el JDK de Android Studio está roto). La receta que funciona:

```bash
npm test
```

```bash
npm run build:www; npx cap sync android
```

```bash
cd android; $env:JAVA_HOME = "$env:ProgramFiles\Android\Android Studio1\jbr"; $env:GRADLE_OPTS = "-Djavax.net.ssl.trustStore=$env:USERPROFILE\.gradle\cacerts-avg -Djavax.net.ssl.trustStorePassword=changeit"; & "$env:USERPROFILE\.gradle\local-dists\gradle-8.14.3\bin\gradle.bat" assembleRelease --no-daemon
```

El APK queda en `android/app/build/outputs/apk/release/RadioAlarm.apk`.

## 5. Comprobar que está bien firmado

No te fíes: un `assembleRelease` sin la firma configurada saca un APK **sin
firmar**, que nadie podrá instalar.

```bash
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.1.0\apksigner.bat" verify --print-certs "android\app\build\outputs\apk\release\RadioAlarm.apk"
```

Debe imprimir el certificado. Si dice que no está firmado, vuelve al paso 3.

## 6. Probarlo en el móvil

Antes de publicarlo, instálalo de verdad:

```bash
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.javiroma1984.radioalarm
```

```bash
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install "android\app\build\outputs\apk\release\RadioAlarm.apk"
```

Y repasa lo mínimo: **conceder los cinco permisos** desde la pantalla de Sonido
(notificaciones, alarmas exactas, pantalla completa, superposición y batería,
más el autoarranque de ColorOS), crear una alarma a dos minutos, cerrar la app
de recientes, bloquear y comprobar que salta la pantalla de alarma. Es el
escenario D del diario, el que más cuesta.

## 7. Etiquetar el commit

La etiqueta es lo que ancla la release a un punto exacto del historial:

```bash
git tag -a v1.0 -m "Fase 10: la alarma suena y se puede parar con el movil bloqueado y la app cerrada"
```

```bash
git push origin v1.0
```

## 8. Crear la release en GitHub

En <https://github.com/JaviRoma1984/RadioAlarm/releases/new>:

| Campo | Qué poner |
|---|---|
| **Choose a tag** | `v1.0`, la que acabas de subir |
| **Release title** | `v1.0 — La alarma ya funciona con el móvil bloqueado` |
| **Describe this release** | Ver la plantilla de abajo |
| **Attach binaries** | Arrastra `RadioAlarm.apk`. **Este es el paso importante**: sin él la release es solo una etiqueta |

### Plantilla de descripción

```markdown
Primera versión en la que la alarma cumple lo que promete: suena y se puede
parar aunque el móvil esté bloqueado y la aplicación cerrada del todo.

### Qué trae
- Alarma nativa de Android con `AlarmManager`: suena con la app cerrada, el
  móvil bloqueado, o las dos cosas a la vez.
- Tono, canción propia o emisora de radio en directo, las tres probadas en los
  cuatro escenarios de apertura posibles.
- Cronómetro y cuenta atrás.
- Instalable también como aplicación web (PWA) desde
  https://JaviRoma1984.github.io/RadioAlarm/

### Instalación
Descarga `RadioAlarm.apk` y ábrelo en el móvil. Android pedirá permiso para
instalar aplicaciones de origen desconocido.

**Al abrirla por primera vez, ve a «Sonido» y concede los permisos que te
pida.** Sin ellos la alarma no puede despertarte con la pantalla apagada: son
permisos de acceso especial que Android no concede solo.

### Limitaciones conocidas
Las de siempre están en el README. La más importante: en móviles con capas
propias (ColorOS, MIUI…) hay que permitir además el **autoarranque** en los
ajustes del fabricante, o el sistema mata la app antes de que llegue la hora.
```

---

## Para las siguientes releases

Ya con el keystore hecho, cada versión es: subir `versionCode` y `versionName`
(paso 1), compilar (paso 4), comprobar la firma (paso 5), probar (paso 6),
etiquetar (paso 7) y publicar (paso 8). Los pasos 2 y 3 no se repiten.

## Un apunte sobre GitHub Pages

La versión web se actualiza sola en cuanto se sube a `main`: no necesita
release ni etiqueta. La release es solo para el APK de Android.
