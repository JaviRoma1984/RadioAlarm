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

**Barra inferior.** Las cuatro acciones principales:

| Botón | Para qué sirve |
|---|---|
| **Crear** | Crear una alarma nueva |
| **Tono** | Elegir el tono de alarma clásico |
| **Canción** | Elegir una canción de una carpeta tuya |
| **Radio** | Elegir la emisora que sonará |

En esta fase los cuatro botones están dibujados pero todavía no hacen nada: al pulsarlos
aparece un aviso indicando en qué fase estarán disponibles.

---

## 3. Modo día y modo noche

Pulsa el botón redondo de la esquina superior derecha:

- Con la **luna** visible, estás en modo día. Al pulsar, pasa a modo noche.
- Con el **sol** visible, estás en modo noche. Al pulsar, vuelve a modo día.

Tu elección **se recuerda** para las siguientes veces que abras la aplicación.

Mientras no pulses el botón ninguna vez, la aplicación sigue automáticamente el tema de
Windows: si cambias Windows a modo oscuro, RadioAlarm se oscurece al momento. En cuanto
eliges un tema a mano, manda tu elección y deja de seguir al sistema.

---

## 4. Qué falta por hacer

| Fase | Qué añadirá |
|---|---|
| 2 | Guardado de las alarmas |
| 3 | Listado de alarmas en la pantalla principal |
| 4 | Pantalla para crear y editar alarmas |
| 5 | Tonos, canciones de tu carpeta y emisoras de radio |
| 6 | Que la alarma suene de verdad, con posponer y vibración |
| 7 | Instalarla en el móvil como aplicación |
| 8 | Publicarla en GitHub Pages |
| 9 | Versión Android que suena con el móvil bloqueado |
