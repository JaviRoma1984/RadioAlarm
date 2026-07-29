# RadioAlarm

Despertador web que suena con un **tono clásico**, una **canción de tu propia carpeta**
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
> **obligatorio**: los módulos de JavaScript, el service worker y el selector de carpetas
> solo funcionan en un contexto seguro.

---

## Estructura

```
RadioAlarm/
├── index.html          Pantalla principal
├── css/
│   ├── tokens.css      Tokens de diseño y temas día/noche
│   ├── base.css        Reinicio, tipografía y estructura
│   └── components.css  Componentes reutilizables
├── js/
│   ├── app.js          Punto de entrada
│   ├── theme.js        Conmutador día/noche
│   ├── store.js        Persistencia sobre localStorage
│   └── ui/
│       ├── vistas.js   Navegación entre pantallas
│       ├── sonido.js   Vista de opciones de sonido
│       ├── plegable.js Listas que se despliegan y encogen
│       ├── layout.js   Medidas de la barra inferior
│       └── toast.js    Avisos flotantes
└── docs/
    └── MANUAL.md       Manual de uso
```

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
| 2 | Modelo de datos y almacenamiento | Pendiente |
| 3 | Pantalla principal con el listado de alarmas | Pendiente |
| 4 | Editor de alarma | Pendiente |
| 5 | Fuentes de sonido: tonos sintetizados, canción y radio | Pendiente |
| 6 | Motor de disparo y pantalla de alarma sonando | Pendiente |
| 7 | Cronómetro y temporizador de cuenta atrás | Pendiente |
| 8 | Convertirla en PWA instalable | Pendiente |
| 9 | Publicación en GitHub Pages y manual | Pendiente |
| 10 | Envoltorio Android nativo: alarma con el móvil bloqueado y tonos del sistema | Pendiente |

---

## Limitaciones conocidas

Documentadas aquí desde el principio porque condicionan el diseño:

- **Como web, la app debe permanecer abierta** para que la alarma suene. No existe una API
  web fiable para programar un aviso futuro con todo cerrado. La Fase 8 lo mitiga
  manteniendo audio de fondo, y la Fase 10 lo resuelve de verdad con el despertador nativo
  de Android.
- **En iPhone la fiabilidad es baja.** Safari suspende las apps en segundo plano de forma
  agresiva y Apple no ofrece a terceros un equivalente al despertador del sistema.
- **El audio necesita una interacción previa** del usuario para desbloquearse (política de
  autoplay de los navegadores).
- **En GitHub Pages, las emisoras deben usar `https://`.** Los streams `http://` se bloquean
  por contenido mixto.
- **El selector de carpetas no existe en móvil.** Allí las canciones se importan y quedan
  guardadas dentro de la propia app.
- **Los tonos de fábrica del móvil no son accesibles desde el navegador.** Viven en una
  carpeta protegida del sistema y solo `RingtoneManager` (nativo) los expone. Por eso los
  tonos incluidos se generan por síntesis con Web Audio, y la lista completa del sistema
  no llega hasta la Fase 10.
