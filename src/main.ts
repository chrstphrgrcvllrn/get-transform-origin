import './style.css'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

type Item = { id: number; name: string; url: string; x: number; y: number; rot: string; scl: string }

const file = $<HTMLInputElement>('file')
const stage = $('stage')
const frame = $('frame')
const img = $<HTMLImageElement>('img')
const marker = $('marker')
const empty = $('empty')
const out = $('out')
const px = $('px')
const thumbs = $('thumbs')
const thumbsEmpty = $('thumbsEmpty')
const xInput = $<HTMLInputElement>('xInput')
const yInput = $<HTMLInputElement>('yInput')
const precision = $<HTMLInputElement>('precision')
const rot = $<HTMLInputElement>('rot')
const scl = $<HTMLInputElement>('scl')

const items: Item[] = []
let activeId: number | null = null
let nextId = 1

const active = () => items.find((i) => i.id === activeId) ?? null
const round = (n: number) => Number(n.toFixed(Number(precision.value) || 0))
const clamp = (n: number) => Math.min(100, Math.max(0, n))
const originOf = (i: Item) => `${round(i.x)}% ${round(i.y)}%`

function renderThumbs() {
  thumbs.replaceChildren(
    ...items.map((i) => {
      const li = document.createElement('li')
      li.className = 'thumb' + (i.id === activeId ? ' active' : '')
      const t = document.createElement('img')
      t.src = i.url
      t.alt = ''
      const info = document.createElement('div')
      info.className = 'thumb-name'
      info.textContent = i.name
      const meta = document.createElement('div')
      meta.className = 'thumb-meta'
      meta.textContent = originOf(i)
      info.append(meta)
      const rm = document.createElement('button')
      rm.className = 'thumb-x'
      rm.type = 'button'
      rm.title = 'Remove'
      rm.textContent = '×'
      rm.addEventListener('click', (e) => (e.stopPropagation(), remove(i.id)))
      li.append(t, info, rm)
      li.addEventListener('click', () => select(i.id))
      return li
    }),
  )
  thumbsEmpty.hidden = items.length > 0
}

function render() {
  const a = active()
  const has = !!a
  frame.hidden = !has
  empty.hidden = has
  document
    .querySelectorAll<HTMLInputElement | HTMLButtonElement>('#xInput,#yInput,#rot,#scl,#reset,#copyReact,#copyCss')
    .forEach((el) => (el.disabled = !has))
  ;($('copyAll') as HTMLButtonElement).disabled = items.length === 0
  renderThumbs()
  if (!a) {
    out.textContent = 'Upload an image, then click it to set the origin'
    px.textContent = ''
    xInput.value = yInput.value = ''
    return
  }
  if (img.getAttribute('src') !== a.url) img.src = a.url
  rot.value = a.rot
  scl.value = a.scl
  marker.style.left = `${a.x}%`
  marker.style.top = `${a.y}%`
  img.style.transformOrigin = originOf(a)
  img.style.transform = `rotate(${a.rot}deg) scale(${a.scl})`
  xInput.value = String(round(a.x))
  yInput.value = String(round(a.y))
  out.textContent = `transformOrigin: "${originOf(a)}"`
  px.textContent = img.naturalWidth
    ? `≈ ${Math.round((a.x / 100) * img.naturalWidth)}px ${Math.round((a.y / 100) * img.naturalHeight)}px (natural size)`
    : ''
}

function select(id: number) {
  activeId = id
  render()
}

function remove(id: number) {
  const idx = items.findIndex((i) => i.id === id)
  if (idx < 0) return
  URL.revokeObjectURL(items[idx].url)
  items.splice(idx, 1)
  if (activeId === id) activeId = items[Math.min(idx, items.length - 1)]?.id ?? null
  render()
}

function load(files: FileList | File[] | null | undefined) {
  const imgs = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
  if (!imgs.length) return
  for (const f of imgs) {
    items.push({ id: nextId++, name: f.name || 'pasted image', url: URL.createObjectURL(f), x: 50, y: 50, rot: '0', scl: '1' })
  }
  activeId = items[items.length - imgs.length].id
  render()
}

img.addEventListener('load', render)

function pointFrom(e: PointerEvent) {
  const a = active()
  if (!a) return
  const r = frame.getBoundingClientRect()
  a.x = clamp(((e.clientX - r.left) / r.width) * 100)
  a.y = clamp(((e.clientY - r.top) / r.height) * 100)
  render()
}

frame.addEventListener('pointerdown', (e) => {
  frame.setPointerCapture(e.pointerId)
  pointFrom(e)
  const move = (ev: PointerEvent) => pointFrom(ev)
  const up = () => {
    frame.removeEventListener('pointermove', move)
    frame.removeEventListener('pointerup', up)
  }
  frame.addEventListener('pointermove', move)
  frame.addEventListener('pointerup', up)
})

xInput.addEventListener('input', () => {
  const a = active()
  if (a) ((a.x = clamp(+xInput.value || 0)), render())
})
yInput.addEventListener('input', () => {
  const a = active()
  if (a) ((a.y = clamp(+yInput.value || 0)), render())
})
precision.addEventListener('input', render)
rot.addEventListener('input', () => {
  const a = active()
  if (a) ((a.rot = rot.value), render())
})
scl.addEventListener('input', () => {
  const a = active()
  if (a) ((a.scl = scl.value), render())
})
$('reset').addEventListener('click', () => {
  const a = active()
  if (a) ((a.rot = '0'), (a.scl = '1'), render())
})

async function copy(btn: HTMLElement, text: string) {
  await navigator.clipboard.writeText(text)
  const old = btn.textContent
  btn.textContent = 'Copied!'
  setTimeout(() => (btn.textContent = old), 1200)
}
const cur = () => originOf(active()!)
$('copyReact').addEventListener('click', (e) => copy(e.currentTarget as HTMLElement, `transformOrigin: "${cur()}"`))
$('copyCss').addEventListener('click', (e) => copy(e.currentTarget as HTMLElement, `transform-origin: ${cur()};`))
$('copyAll').addEventListener('click', (e) =>
  copy(e.currentTarget as HTMLElement, items.map((i) => `${i.name}: transformOrigin: "${originOf(i)}"`).join('\n')),
)

$('upload').addEventListener('click', () => file.click())
file.addEventListener('change', () => {
  load(file.files)
  file.value = ''
})
stage.addEventListener('dragover', (e) => e.preventDefault())
stage.addEventListener('drop', (e) => {
  e.preventDefault()
  load(e.dataTransfer?.files)
})
window.addEventListener('paste', (e) => load(e.clipboardData?.files))

$('theme').addEventListener('click', () => {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light'
})

render()
