export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '80px 24px' }}
    >
      <span className="cpe-spinner" />
      <style>{`
        .cpe-spinner {
          width: 34px; height: 34px; border-radius: 50%;
          border: 3px solid var(--rule, #E4E8EF);
          border-top-color: var(--cp-green, #6CAE52);
          animation: cpe-spin 0.7s linear infinite;
        }
        @keyframes cpe-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .cpe-spinner { animation-duration: 1.6s; }
        }
      `}</style>
    </div>
  )
}
