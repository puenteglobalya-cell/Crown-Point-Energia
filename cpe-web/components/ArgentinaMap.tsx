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
        <path
          d="M 295 60 C 320 56, 340 64, 348 78 L 358 96 C 368 110, 378 120, 388 130 L 402 150 C 414 168, 422 188, 426 208 L 426 226 C 428 250, 432 270, 436 290 L 438 308 C 440 326, 436 340, 426 352 L 414 366 C 400 376, 394 392, 396 410 L 402 428 C 404 446, 396 460, 386 472 L 376 488 C 366 504, 354 518, 342 532 L 332 550 C 322 566, 314 582, 304 598 L 294 616 C 282 634, 268 650, 252 664 L 236 678 C 220 690, 208 700, 196 706 L 184 712 C 174 716, 166 716, 160 712 L 152 706 C 146 696, 144 684, 144 670 L 146 652 C 152 632, 158 612, 164 592 L 170 572 C 176 552, 180 530, 184 510 L 188 488 C 192 466, 194 444, 192 422 L 188 400 C 184 378, 180 354, 178 330 L 176 308 C 176 286, 180 264, 184 242 L 188 220 C 192 198, 196 178, 200 158 L 206 138 C 214 118, 224 100, 236 84 L 252 70 C 268 60, 282 56, 295 60 Z"
          className="cc-country cc-stroke" strokeWidth="1.5" strokeLinejoin="round"
        />
        <path
          d="M 168 740 C 188 738, 208 742, 226 750 L 244 762 L 252 774 C 252 784, 240 790, 224 792 L 208 792 C 192 790, 178 786, 168 778 L 160 770 C 156 760, 158 750, 168 740 Z"
          className="cc-country cc-stroke" strokeWidth="1.5" strokeLinejoin="round"
        />
        <g className="cc-stroke" strokeWidth="0.6" opacity="0.2" fill="none">
          <path d="M 198 120 L 392 145" /><path d="M 188 180 L 414 200" />
          <path d="M 184 248 L 432 268" /><path d="M 184 304 L 438 318" />
          <path d="M 186 360 L 410 378" /><path d="M 188 420 L 396 432" />
          <path d="M 188 478 L 380 488" /><path d="M 184 532 L 348 542" />
          <path d="M 174 588 L 320 600" /><path d="M 162 656 L 268 670" />
        </g>
      </g>

      <g className="ar-province">
        <text x="316" y="282" textAnchor="middle">MENDOZA</text>
        <text x="328" y="510" textAnchor="middle">CHUBUT</text>
        <text x="290" y="612" textAnchor="middle">SANTA CRUZ</text>
        <text x="210" y="772" textAnchor="middle">TIERRA DEL FUEGO</text>
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
      <g className="ar-block" data-block="tdf">
        <ellipse cx="208" cy="760" rx="34" ry="15" className="cc-teal-dark" opacity="0.95" />
        <line className="ar-leader" x1="242" y1="760" x2="468" y2="760" />
        <circle cx="468" cy="760" r="2.5" className="cc-fill-leader" />
        <text x="476" y="753" className="ar-label">Río Cullen · Las Violetas</text>
        <text x="476" y="767" className="ar-label">La Angostura</text>
        <text x="476" y="781" className="ar-sublabel">Cuenca Austral · Tierra del Fuego</text>
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
        <g transform="translate(0, 100)"><rect width="12" height="12" rx="2" className="cc-teal-dark" /><text x="22" y="10" className="ar-legend-text">Cuenca Austral</text></g>
      </g>
    </svg>
  )
}
