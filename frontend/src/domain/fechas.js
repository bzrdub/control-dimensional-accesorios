// Fechas en formato chileno (dd-mm-aaaa, como en las planillas) para la UI; ISO (aaaa-mm-dd) para la API.

const pad = (x) => String(x).padStart(2, '0')

/** Hoy en la zona del navegador, como 'aaaa-mm-dd'. */
export function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** '2026-11-16' → '16-11-2026' ('' si no es ISO). */
export function isoATexto(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
}

/** '16-11-2026' → '2026-11-16'; '' si está incompleta o no existe (p. ej. 31-02-2026). */
export function textoAISO(texto) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto ?? '')
  if (!m) return ''
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const f = new Date(a, mes - 1, d)
  if (f.getFullYear() !== a || f.getMonth() !== mes - 1 || f.getDate() !== d) return ''
  return `${m[3]}-${m[2]}-${m[1]}`
}

/** Formatea lo que se va escribiendo: solo dígitos, guiones automáticos, máx. dd-mm-aaaa. */
export function mascaraFecha(texto) {
  const dig = String(texto).replace(/\D/g, '').slice(0, 8)
  if (dig.length <= 2) return dig
  if (dig.length <= 4) return `${dig.slice(0, 2)}-${dig.slice(2)}`
  return `${dig.slice(0, 2)}-${dig.slice(2, 4)}-${dig.slice(4)}`
}
