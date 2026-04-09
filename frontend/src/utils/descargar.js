/**
 * Descarga un gráfico Recharts (SVG) como PNG con fondo blanco.
 * Resuelve las variables CSS (var(--xxx)) antes de serializar el SVG
 * para que los colores aparezcan correctamente fuera del documento.
 *
 * @param {React.RefObject} containerRef  — ref al div que envuelve el ResponsiveContainer
 * @param {string}          filename      — nombre del archivo descargado
 */
export function descargarGrafica(containerRef, filename) {
  const svg = containerRef.current?.querySelector('svg')
  if (!svg) return

  const { width, height } = svg.getBoundingClientRect()

  // Clonar el SVG e inlinear los estilos computados de cada elemento
  // para que var(--primary), var(--success), etc. queden como valores reales.
  const clone      = svg.cloneNode(true)
  const origEls    = [svg,   ...svg.querySelectorAll('*')]
  const cloneEls   = [clone, ...clone.querySelectorAll('*')]
  const docStyle   = getComputedStyle(document.documentElement)

  origEls.forEach((el, i) => {
    const clEl = cloneEls[i]
    if (!clEl || typeof el.getAttribute !== 'function') return

    const cs = window.getComputedStyle(el)

    // Inlinear las propiedades de presentación que Recharts usa
    const props = ['stroke', 'fill', 'color', 'stroke-width', 'opacity',
                   'font-size', 'font-family', 'font-weight']
    props.forEach(p => {
      const v = cs.getPropertyValue(p)
      if (v && v !== '' && v !== 'none' && v !== 'normal') {
        clEl.style[p] = v
      }
    })

    // Resolver var(--xxx) que queden en atributos directos
    for (const attr of Array.from(clEl.attributes)) {
      const m = attr.value.match(/^var\((--[\w-]+)\)$/)
      if (m) {
        const resolved = docStyle.getPropertyValue(m[1]).trim()
        if (resolved) clEl.setAttribute(attr.name, resolved)
      }
    }
  })

  // Asignar dimensiones explícitas al clon
  clone.setAttribute('width',  width)
  clone.setAttribute('height', height)

  const scale  = 2
  const canvas = document.createElement('canvas')
  canvas.width  = width  * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(scale, scale)

  const svgData = new XMLSerializer().serializeToString(clone)
  const blob    = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url     = URL.createObjectURL(blob)

  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    _descargar(canvas.toDataURL('image/png'), filename)
  }
  img.onerror = () => URL.revokeObjectURL(url)
  img.src = url
}

/**
 * Descarga el calendario completo como PNG de alta resolución.
 *
 * Problema base: el contenedor tiene overflowX:auto, por lo que html2canvas
 * captura únicamente la parte visible. La solución es:
 *  1. Quitar temporalmente el clipping y expandir el elemento a su ancho real.
 *  2. Medir scrollWidth / scrollHeight (dimensiones reales del contenido).
 *  3. Capturar a escala 3× para calidad de reporte (≥300 dpi efectivos).
 *  4. Restaurar los estilos originales.
 *
 * @param {React.RefObject} containerRef  — ref al div del calendario
 * @param {string}          filename      — nombre del archivo descargado
 */
export async function descargarCalendario(containerRef, filename) {
  const { default: html2canvas } = await import('html2canvas')
  const el = containerRef.current
  if (!el) return

  // Guardar estilos originales
  const orig = {
    overflow:  el.style.overflow,
    overflowX: el.style.overflowX,
    width:     el.style.width,
    maxWidth:  el.style.maxWidth,
  }

  // Expandir para que todo el contenido quede visible
  el.style.overflow  = 'visible'
  el.style.overflowX = 'visible'
  el.style.width     = el.scrollWidth  + 'px'
  el.style.maxWidth  = 'none'

  const fullW = el.scrollWidth
  const fullH = el.scrollHeight

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale:        3,          // 3× → calidad de reporte
      useCORS:      true,
      scrollX:      0,
      scrollY:      -window.scrollY,
      width:        fullW,
      height:       fullH,
      windowWidth:  fullW,
    })
    _descargar(canvas.toDataURL('image/png', 1.0), filename)
  } finally {
    // Restaurar siempre, aunque falle la captura
    el.style.overflow  = orig.overflow
    el.style.overflowX = orig.overflowX
    el.style.width     = orig.width
    el.style.maxWidth  = orig.maxWidth
  }
}

function _descargar(dataUrl, filename) {
  const a    = document.createElement('a')
  a.download = filename
  a.href     = dataUrl
  a.click()
}
