'use client'

import { useEffect, useRef, useState } from 'react'

type PostIt = { id: string; texto: string; hecho: boolean; orden: number; created_at: string }

// Colores de post-it clásicos, rotados por índice -- no hace falta elegir
// color a mano, cada tarjeta nueva toma el siguiente de la paleta.
const COLORES = ['#fff3a0', '#ffd9a0', '#c8f0c2', '#bfe3ff', '#f3c8ff', '#ffc8d9']

export default function PostItsComercial() {
  const [items, setItems] = useState<PostIt[]>([])
  const [nuevo, setNuevo] = useState('')
  const [agregando, setAgregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/comercial/postits')
      .then(r => r.ok ? r.json() : [])
      .then((rows: PostIt[]) => setItems(rows))
      .catch(() => {})
  }, [])

  async function agregar() {
    const texto = nuevo.trim()
    if (!texto) return
    setAgregando(true)
    try {
      const res = await fetch('/api/comercial/postits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      if (res.ok) {
        const item = await res.json() as PostIt
        setItems(prev => [...prev, item])
        setNuevo('')
        inputRef.current?.focus()
      }
    } finally {
      setAgregando(false)
    }
  }

  async function toggleHecho(item: PostIt) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, hecho: !i.hecho } : i))
    await fetch(`/api/comercial/postits/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hecho: !item.hecho }),
    }).catch(() => {})
  }

  async function editarTexto(item: PostIt, texto: string) {
    if (!texto.trim() || texto === item.texto) return
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, texto } : i))
    await fetch(`/api/comercial/postits/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto }),
    }).catch(() => {})
  }

  async function borrar(item: PostIt) {
    const texto = window.prompt(`¿Eliminar "${item.texto}"?\n\nEscribí BORRAR para confirmar.`)
    if ((texto ?? '').trim().toLowerCase() !== 'borrar') return
    setItems(prev => prev.filter(i => i.id !== item.id))
    await fetch(`/api/comercial/postits/${item.id}`, { method: 'DELETE' }).catch(() => {})
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8e91b0', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
        📌 Pendientes sueltos — sin fecha
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              background: COLORES[i % COLORES.length],
              width: 170,
              minHeight: 110,
              borderRadius: 2,
              padding: '12px 12px 8px',
              boxShadow: '2px 3px 8px rgba(0,0,0,0.15)',
              transform: `rotate(${(i % 3) - 1}deg)`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <input type="checkbox" checked={item.hecho} onChange={() => toggleHecho(item)} style={{ cursor: 'pointer', marginTop: 2 }} />
              <button onClick={() => borrar(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'rgba(0,0,0,0.4)', lineHeight: 1 }}>×</button>
            </div>
            <textarea
              defaultValue={item.texto}
              onBlur={e => editarTexto(item, e.target.value)}
              maxLength={500}
              rows={4}
              style={{
                flex: 1, background: 'transparent', border: 'none', resize: 'none', outline: 'none',
                fontSize: 12.5, fontFamily: 'inherit', color: '#2a2410',
                textDecoration: item.hecho ? 'line-through' : 'none',
                opacity: item.hecho ? 0.55 : 1,
              }}
            />
          </div>
        ))}

        {/* Tarjeta para agregar una nueva */}
        <div style={{ width: 170, minHeight: 110, borderRadius: 2, padding: '12px', border: '2px dashed var(--rule)', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <input
            ref={inputRef}
            value={nuevo}
            onChange={e => setNuevo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') agregar() }}
            placeholder="Nueva tarea…"
            maxLength={500}
            style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid var(--rule)', width: '100%', boxSizing: 'border-box' }}
          />
          <button
            disabled={agregando || !nuevo.trim()}
            onClick={agregar}
            className="btn btn-primary"
            style={{ fontSize: 11, padding: '6px 10px' }}
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
