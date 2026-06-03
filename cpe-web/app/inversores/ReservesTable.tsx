import { SPROULE_P1_2024, totalP1 } from '@/lib/reserves'

export default function ReservesTable() {
  const data  = SPROULE_P1_2024
  const total = totalP1(data)
  const rows  = [...data.categories, total]

  return (
    <details className="reserves-details">
      <summary className="reserves-summary">
        <span className="reserves-summary__label">
          <span className="lang-es">Reservas P1 Certificadas — {data.certifier}</span>
          <span className="lang-en">Certified P1 Reserves — {data.certifier}</span>
        </span>
        <span className="reserves-summary__total">
          <span className="lang-es">Total bruto <strong>{total.gross.toFixed(3)}</strong> MMboe</span>
          <span className="lang-en">Total gross <strong>{total.gross.toFixed(3)}</strong> MMboe</span>
        </span>
      </summary>

      <div className="reserves-body">
        <table className="reserves-table" aria-label="Reservas P1 Sproule">
          <thead>
            <tr>
              <th scope="col">
                <span className="lang-es">Categoría</span>
                <span className="lang-en">Category</span>
              </th>
              <th scope="col" className="num">
                <span className="lang-es">Bruto (MMboe)</span>
                <span className="lang-en">Gross (MMboe)</span>
              </th>
              <th scope="col" className="num">
                <span className="lang-es">Neto (MMboe)</span>
                <span className="lang-en">Net (MMboe)</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.category} data-total={i === rows.length - 1 ? '' : undefined}>
                <td>
                  <span className="lang-es">{r.category}</span>
                  <span className="lang-en">{r.category === 'Total P1' ? 'Total P1' : r.category}</span>
                </td>
                <td className="num">{r.gross.toFixed(3)}</td>
                <td className="num">{r.net.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="reserves-footnote">
          <span className="lang-es">
            Certificadas al 31/12/2024 bajo NI 51-101. Volúmenes en MMboe (millones de barriles de petróleo equivalente).
            Bruto = participación de trabajo bruta; Neto = porción correspondiente a Crown Point después de regalías.
          </span>
          <span className="lang-en">
            Certified as of 31/12/2024 under NI 51-101. Volumes in MMboe (millions of barrels of oil equivalent).
            Gross = working interest share before royalties; Net = Crown Point share after royalties.
          </span>
        </p>
      </div>

      <style>{`
        .reserves-details {
          border: 1px solid var(--rule);
          border-radius: var(--r-lg);
          background: var(--surface);
          margin-top: var(--s-6);
        }
        .reserves-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--s-4);
          padding: var(--s-5) var(--s-6);
          cursor: pointer;
          list-style: none;
          flex-wrap: wrap;
        }
        .reserves-summary::-webkit-details-marker { display: none; }
        .reserves-summary::after {
          content: '▸';
          font-size: 12px;
          color: var(--fg-muted);
          flex-shrink: 0;
          transition: transform .2s;
        }
        details[open] .reserves-summary::after { transform: rotate(90deg); }
        .reserves-summary__label {
          font-size: 13px;
          font-weight: 600;
          color: var(--fg);
        }
        .reserves-summary__total {
          font-size: 13px;
          color: var(--fg-soft);
          font-family: var(--font-mono, monospace);
        }
        .reserves-body {
          border-top: 1px solid var(--rule);
          padding: var(--s-4) var(--s-6) var(--s-5);
        }
        .reserves-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .reserves-table th {
          text-align: left;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--fg-muted);
          font-weight: 600;
          padding: 6px 0 8px;
          border-bottom: 1px solid var(--rule);
        }
        .reserves-table th.num,
        .reserves-table td.num {
          text-align: right;
          font-family: var(--font-mono, monospace);
        }
        .reserves-table td {
          padding: 8px 0;
          border-bottom: 1px solid var(--rule);
          color: var(--fg-soft);
        }
        .reserves-table tr:last-child td {
          border-bottom: none;
          font-weight: 700;
          color: var(--fg);
        }
        .reserves-footnote {
          font-size: 11px;
          color: var(--fg-muted);
          margin-top: var(--s-4);
          line-height: 1.55;
        }
      `}</style>
    </details>
  )
}
