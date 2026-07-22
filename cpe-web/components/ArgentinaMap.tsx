import type { CSSProperties } from 'react'

export default function ArgentinaMap({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 720 820"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className={`ar-map${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="Mapa de Argentina con bloques operativos de Crown Point Energy"
      style={style}
    >
      <defs>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#0E1235" floodOpacity={0.12} />
        </filter>
      </defs>

      <g className="ar-country" filter="url(#softShadow)">
        {/*
          Argentina mainland — single closed clockwise path from NW corner.

          The country tapers to a narrow pinch at the Strait of Magellan (~y=700).
          East coast ends at (200, 702); west coast resumes at (162, 700).
          These connect via a short curve representing the strait opening.

          Block ellipse centres for reference (must stay inside the shape):
            PPC       280, 248  — Mendoza/Neuquina
            Chañares  262, 294  — Mendoza/Cuyana
            Cerro     252, 340  — Mendoza/Neuquina
            Tordillo  246, 510  — Chubut
            Piedra    234, 582  — Santa Cruz
            TDF       208, 760  — (island, separate path)

          Leader lines run to x=468, so east edge near y=248–582 must reach ~x=430+.
        */}
        <path
          d="
            M 210,60
            C 250,55 296,55 342,56
            C 370,57 392,60 408,65
            C 415,69 420,80 422,94
            C 424,106 428,118 430,130
            C 430,138 427,148 422,155
            C 418,161 416,167 418,172
            C 420,177 426,183 432,188
            C 438,192 443,198 445,206
            C 446,214 443,222 439,230
            C 436,236 435,244 437,254
            C 439,264 440,274 438,284
            C 436,294 431,304 427,314
            C 424,322 422,330 424,340
            C 428,350 434,360 439,372
            C 443,382 446,394 444,406
            C 442,418 435,428 430,436
            C 436,442 444,450 448,462
            C 452,474 450,487 445,499
            C 440,511 432,521 423,531
            C 414,541 404,549 395,557
            C 386,565 376,573 367,582
            C 358,591 348,600 337,610
            C 326,620 314,630 301,640
            C 288,650 274,660 260,669
            C 246,677 232,684 218,691
            C 210,695 204,699 200,702
            C 192,705 182,705 172,702
            C 164,699 158,693 156,686
            C 155,679 156,671 158,663
            C 160,653 162,641 163,628
            C 164,615 163,601 162,587
            C 161,573 160,559 160,545
            C 160,531 161,517 162,503
            C 163,489 165,475 167,461
            C 169,447 170,433 170,419
            C 170,405 170,391 170,377
            C 170,363 171,349 173,335
            C 175,321 178,307 181,293
            C 184,279 187,265 190,251
            C 193,237 195,223 197,209
            C 199,195 201,181 203,167
            C 205,153 207,139 208,125
            C 209,111 210,97 210,83
            Z
          "
          className="cc-country cc-stroke" strokeWidth="1.5" strokeLinejoin="round"
        />
        {/* Tierra del Fuego island */}
        <path
          d="
            M 163,736
            C 173,729 187,724 202,724
            C 217,724 231,729 243,737
            C 252,744 257,754 254,764
            C 250,774 240,781 227,784
            C 214,787 200,787 188,784
            C 175,780 163,773 157,764
            C 152,756 153,747 158,740
            C 160,738 161,737 163,736
            Z
          "
          className="cc-country cc-stroke" strokeWidth="1.5" strokeLinejoin="round"
        />
      </g>

      <g className="ar-province">
        <text x="316" y="282" textAnchor="middle">MENDOZA</text>
        <text x="328" y="510" textAnchor="middle">CHUBUT</text>
        <text x="290" y="612" textAnchor="middle">SANTA CRUZ</text>
        <text x="318" y="120" textAnchor="middle" opacity="0.45">SALTA / JUJUY</text>
        <text x="332" y="200" textAnchor="middle" opacity="0.45">CÓRDOBA</text>
        <text x="356" y="408" textAnchor="middle" opacity="0.45">RÍO NEGRO</text>
      </g>

      <g className="ar-block" data-block="ppc">
        <ellipse cx="280" cy="248" rx="26" ry="14" className="cc-amber" opacity="0.92" />
        <line className="ar-leader" x1="306" y1="248" x2="468" y2="248" />
        <circle cx="468" cy="248" r="2.5" className="cc-fill-leader" />
        <text x="476" y="245" className="ar-label">Puesto Pozo Cercado Oriental</text>
        <text x="476" y="259" className="ar-sublabel">Cuenca Neuquina · Mendoza</text>
      </g>
      <g className="ar-block" data-block="chanares">
        <ellipse cx="262" cy="294" rx="28" ry="14" className="cc-green-light" opacity="0.94" />
        <line className="ar-leader" x1="290" y1="294" x2="468" y2="294" />
        <circle cx="468" cy="294" r="2.5" className="cc-fill-leader" />
        <text x="476" y="291" className="ar-label">Chañares Herrados</text>
        <text x="476" y="305" className="ar-sublabel">Cuenca Cuyana · Mendoza</text>
      </g>
      <g className="ar-block" data-block="cerro">
        <ellipse cx="252" cy="340" rx="30" ry="15" className="cc-green" opacity="0.92" />
        <line className="ar-leader" x1="282" y1="340" x2="468" y2="340" />
        <circle cx="468" cy="340" r="2.5" className="cc-fill-leader" />
        <text x="476" y="337" className="ar-label">Cerro de Los Leones</text>
        <text x="476" y="351" className="ar-sublabel">Cuenca Neuquina · Mendoza</text>
      </g>
      <g className="ar-block" data-block="tordillo">
        <ellipse cx="246" cy="510" rx="30" ry="15" className="cc-green" opacity="0.92" />
        <line className="ar-leader" x1="276" y1="510" x2="468" y2="510" />
        <circle cx="468" cy="510" r="2.5" className="cc-fill-leader" />
        <text x="476" y="507" className="ar-label">El Tordillo · La Tapera · P. Quiroga</text>
        <text x="476" y="521" className="ar-sublabel">Golfo San Jorge · Chubut</text>
      </g>
      <g className="ar-block" data-block="piedra">
        <ellipse cx="234" cy="582" rx="28" ry="14" className="cc-teal" opacity="0.94" />
        <line className="ar-leader" x1="262" y1="582" x2="468" y2="582" />
        <circle cx="468" cy="582" r="2.5" className="cc-fill-leader" />
        <text x="476" y="579" className="ar-label">Piedra Clavada – Koluel Kaike</text>
        <text x="476" y="593" className="ar-sublabel">Golfo San Jorge · Santa Cruz</text>
      </g>
      <g className="ar-hq">
        <circle cx="402" cy="300" r="4" className="cc-fill-stroke" />
        <circle cx="402" cy="300" r="11" fill="none" className="cc-stroke" strokeWidth="0.8" opacity="0.5" />
        <line x1="406" y1="300" x2="438" y2="282" className="cc-stroke" strokeWidth="0.7" opacity="0.7" />
        <text x="442" y="280" className="ar-hq-label">HQ · BUENOS AIRES</text>
      </g>
      <g transform="translate(96, 78)" className="ar-compass">
        <path d="M 0 -16 L 7 9 L 0 0 L -7 9 Z" className="cc-fill-stroke" opacity="0.55" />
        <text x="0" y="26" textAnchor="middle" className="ar-compass-text">N</text>
      </g>
      <g transform="translate(40, 120)" className="ar-legend">
        <text x="0" y="0" className="ar-legend-title">BLOQUES OPERATIVOS</text>
        <g transform="translate(0, 20)"><rect width="12" height="12" rx="2" className="cc-amber" /><text x="22" y="10" className="ar-legend-text">Neuquina Norte</text></g>
        <g transform="translate(0, 40)"><rect width="12" height="12" rx="2" className="cc-green-light" /><text x="22" y="10" className="ar-legend-text">Cuyana</text></g>
        <g transform="translate(0, 60)"><rect width="12" height="12" rx="2" className="cc-green" /><text x="22" y="10" className="ar-legend-text">Neuquina / San Jorge N.</text></g>
        <g transform="translate(0, 80)"><rect width="12" height="12" rx="2" className="cc-teal" /><text x="22" y="10" className="ar-legend-text">Golfo San Jorge S.</text></g>
      </g>
    </svg>
  )
}
