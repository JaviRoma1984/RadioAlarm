/**
 * RadioAlarm · Catálogo de emisoras
 *
 * A diferencia de los tonos, aquí no hay presets "seguros": una URL de stream
 * se queda anticuada con facilidad (la emisora cambia de proveedor, cierra el
 * stream antiguo…). Las que aparecen aquí se comprobaron una a una —cada una
 * respondiendo con `200` y un tipo de audio real— al escribir este archivo,
 * pero eso no es una garantía para siempre: por eso el selector siempre deja
 * un hueco para que el usuario escriba y pruebe la suya.
 *
 * Se quedaron fuera Cadena 100 y Rock FM: sus streams solo existen en HLS
 * (`.m3u8`); su propio reproductor oficial usa una librería para convertirlo
 * en algo reproducible en Chrome, y un `<audio src>` normal no lo consigue —
 * caería siempre al tono—. Máxima FM tampoco: como emisora nacional dejó de
 * emitir en 2019, sustituida por LOS40 Dance, que ya está en esta lista.
 */

export const EMISORAS = [
  {
    id: "los40",
    nombre: "LOS40",
    descripcion: "Éxitos y música actual",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/Los40.mp3",
  },
  {
    id: "los40-classic",
    nombre: "LOS40 Classic",
    descripcion: "Los grandes éxitos de siempre",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_CLASSIC.mp3",
  },
  {
    id: "los40-dance",
    nombre: "LOS40 Dance",
    descripcion: "Dance, house y electrónica",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/LOS40_DANCE.mp3",
  },
  {
    id: "cadena-dial",
    nombre: "Cadena Dial",
    descripcion: "Música en español",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL.mp3",
  },
  {
    id: "cadena-dial-latino",
    nombre: "Cadena Dial Latino",
    descripcion: "Latina, urbana y reguetón",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/CADENADIAL_02.mp3",
  },
  {
    id: "hit-fm",
    nombre: "Hit FM",
    descripcion: "Dance y música de club",
    url: "https://bbhitfm.kissfmradio.cires21.com/bbhitfm.mp3",
  },
  {
    id: "flaix-fm",
    nombre: "Flaix FM",
    descripcion: "Éxitos, en catalán",
    url: "https://stream.flaixfm.cat/icecast",
  },
];
