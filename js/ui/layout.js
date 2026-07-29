/**
 * RadioAlarm · Medidas de la estructura
 *
 * La altura real de la barra inferior depende del tamaño de letra del sistema y
 * del margen de seguridad del móvil (`env(safe-area-inset-bottom)`), así que no
 * se puede fijar en CSS. Aquí se mide y se publica como la variable
 * `--bar-real`, que usan el botón flotante, los avisos y el hueco inferior del
 * listado. Si este módulo no llegara a ejecutarse, el CSS cae en el valor de
 * reserva `--bar-height`.
 */

export function iniciarMedidas() {
  const barra = document.querySelector(".app__bar");
  if (!barra) return;

  const publicar = () => {
    const alto = barra.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--bar-real", `${alto}px`);
  };

  publicar();

  if ("ResizeObserver" in window) {
    new ResizeObserver(publicar).observe(barra);
  } else {
    window.addEventListener("resize", publicar);
  }
}
