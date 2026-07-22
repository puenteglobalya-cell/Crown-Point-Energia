// Central registry of all backup-able tables.
// Add one entry here whenever a new table is created.
// Both the backup UI (admin/backup/page.tsx) and the API route (api/admin/backup/route.ts)
// read from this file — same pattern as lib/site-sections.ts for the sitemap.

export type BackupCategory =
  | 'cms'
  | 'acceso'
  | 'contenido'
  | 'reportes'
  | 'biblioteca'
  | 'contactos'
  | 'no-incluido'

export type BackupTable = {
  table: string
  key: string
  label: string
  description: string
  category: BackupCategory
  select?: string   // default '*'
  notes?: string
  included: boolean
}

export const BACKUP_TABLES: BackupTable[] = [

  // ── Configuración CMS ────────────────────────────────────────────────────
  {
    table: 'cms_settings',  key: 'cms_settings',  label: 'Configuración CMS',
    description: 'Tema, idioma, dirección, modo mantenimiento',
    category: 'cms', included: true,
  },
  {
    table: 'cms_fields',    key: 'cms_fields',    label: 'Campos del sitio',
    description: 'Cotización, KPIs, textos editables bilingüe',
    category: 'cms', included: true,
  },
  {
    table: 'cms_sections',  key: 'cms_sections',  label: 'Secciones visibles',
    description: 'Visibilidad de cada sección pública',
    category: 'cms', included: true,
  },
  {
    table: 'cms_history',   key: 'cms_history',   label: 'Historial CMS',
    description: 'Snapshots anteriores del estado CMS',
    category: 'cms', included: true,
    select: 'id, label, created_by, created_at',
    notes: 'Snapshot completo excluido para reducir tamaño del archivo',
  },

  // ── Roles y acceso ───────────────────────────────────────────────────────
  {
    table: 'user_roles',          key: 'user_roles',          label: 'Roles de usuarios',
    description: 'Asignaciones de rol y estado activo por usuario',
    category: 'acceso', included: true,
    select: 'user_id, role, activo, created_at, updated_at',
  },
  {
    table: 'role_permissions',    key: 'role_permissions',    label: 'Permisos',
    description: 'Matriz de permisos por rol',
    category: 'acceso', included: true,
  },
  {
    table: 'report_type_access',  key: 'report_type_access',  label: 'Acceso a tipos de reporte',
    description: 'Qué roles pueden ver y cargar cada tipo de reporte',
    category: 'acceso', included: true,
  },
  {
    table: 'portal_report_access', key: 'portal_report_access', label: 'Acceso individual a reportes',
    description: 'Reportes asignados explícitamente a accionistas',
    category: 'acceso', included: true,
  },
  {
    table: 'bib_usuario_grupos',  key: 'bib_usuario_grupos',  label: 'Grupos de biblioteca',
    description: 'Asignación de usuarios a grupos de acceso',
    category: 'acceso', included: true,
  },
  {
    table: 'bib_carpeta_grupos',  key: 'bib_carpeta_grupos',  label: 'Acceso a carpetas',
    description: 'Qué grupos de acceso pueden ver qué carpetas',
    category: 'acceso', included: true,
  },

  // ── Contenido editorial ──────────────────────────────────────────────────
  {
    table: 'comunicados',         key: 'comunicados',         label: 'Comunicados de prensa',
    description: 'Press releases bilingüe publicados y borradores',
    category: 'contenido', included: true,
  },
  {
    table: 'operations_blocks',   key: 'operations_blocks',   label: 'Bloques operativos',
    description: 'Los bloques operativos: descripción, stats, coordenadas geográficas',
    category: 'contenido', included: true,
  },
  {
    table: 'esg_pillar_data',     key: 'esg_pillar_data',     label: 'Pilares ESG',
    description: 'Ambiental, Social, Gobernanza — métricas e iniciativas',
    category: 'contenido', included: true,
  },
  {
    table: 'team_members',        key: 'team_members',        label: 'Equipo directivo',
    description: 'Management y directorio CPE Inc.',
    category: 'contenido', included: true,
  },
  {
    table: 'ir_analysts',         key: 'ir_analysts',         label: 'Analistas IR',
    description: 'Cobertura de analistas y ratings',
    category: 'contenido', included: true,
  },
  {
    table: 'obligaciones_negociables', key: 'obligaciones_negociables', label: 'Obligaciones negociables',
    description: 'Programa de ONs: serie, monto, vencimiento, ISIN, bolsa',
    category: 'contenido', included: true,
  },
  {
    table: 'ir_events',           key: 'ir_events',           label: 'Calendario financiero',
    description: 'Earnings, AGM y eventos de relaciones con inversores',
    category: 'contenido', included: true,
  },
  {
    table: 'ir_documents',        key: 'ir_documents',        label: 'Documentos IR',
    description: 'EE.FF., MD&A, AGM, ESTMA, gobierno y ONs (CPI/CPESA)',
    category: 'contenido', included: true,
  },
  {
    table: 'cnv_hechos',          key: 'cnv_hechos',          label: 'Hechos relevantes CNV',
    description: 'Hechos relevantes y estados contables sincronizados desde la CNV',
    category: 'contenido', included: true,
  },
  {
    table: 'shareholder_meetings', key: 'shareholder_meetings', label: 'Asambleas de accionistas',
    description: 'Asambleas (AGM/EGM): fecha, lugar, formato y record date',
    category: 'contenido', included: true,
  },
  {
    table: 'strategy_cards',      key: 'strategy_cards',      label: 'Pilares de estrategia',
    description: 'Cards de estrategia corporativa de la página Acerca de',
    category: 'contenido', included: true,
  },
  {
    table: 'open_positions',      key: 'open_positions',      label: 'Posiciones abiertas',
    description: 'Búsquedas laborales activas en la sección Carreras',
    category: 'contenido', included: true,
  },
  {
    table: 'culture_cards',       key: 'culture_cards',       label: 'Cultura corporativa',
    description: 'Valores y cultura de la empresa',
    category: 'contenido', included: true,
  },
  {
    table: 'documentos',          key: 'documentos',          label: 'Documentos IR',
    description: 'Metadatos de documentos financieros públicos',
    category: 'contenido', included: true,
    select: 'id, titulo_es, titulo_en, tipo, periodo, file_name, publico, created_at, updated_at',
    notes: 'Sin archivos físicos — descargar desde Supabase → Storage',
  },
  {
    table: 'se_referencias',      key: 'se_referencias',      label: 'Refs. Sec. Energía',
    description: 'Cache de precios de referencia del mercado de combustibles líquidos',
    category: 'contenido', included: true,
    select: 'id, fecha_desde, fecha_hasta, scraped_at, brent_ref',
    notes: 'Sin datos crudos (headers/filas) para reducir tamaño',
  },

  // ── Reportes ────────────────────────────────────────────────────────────
  {
    table: 'report_types', key: 'report_types', label: 'Tipos de reporte',
    description: 'Registro de parsers disponibles (ingresos, producción, financiero…)',
    category: 'reportes', included: true,
  },
  {
    table: 'reportes', key: 'reportes', label: 'Metadatos de reportes',
    description: 'Título, período, tipo y estado de cada reporte subido',
    category: 'reportes', included: true,
    select: 'id, type_id, titulo, periodo, estado, file_name, file_size, subido_por, created_at, updated_at',
    notes: 'Sin HTML ni datos Excel — solo metadatos. Los archivos están en Storage.',
  },

  // ── Biblioteca interna ───────────────────────────────────────────────────
  {
    table: 'bib_grupos',    key: 'bib_grupos',    label: 'Grupos de acceso',
    description: 'Departamentos: Contabilidad, RRHH, Compras, etc.',
    category: 'biblioteca', included: true,
  },
  {
    table: 'bib_carpetas',  key: 'bib_carpetas',  label: 'Carpetas',
    description: 'Estructura de carpetas de la biblioteca interna',
    category: 'biblioteca', included: true,
  },
  {
    table: 'bib_documentos', key: 'bib_documentos', label: 'Documentos internos',
    description: 'Metadatos de archivos internos (PDFs, Excel, Word…)',
    category: 'biblioteca', included: true,
    select: 'id, carpeta_id, nombre, path, size_bytes, mime_type, vigente, subido_por, created_at',
    notes: 'Sin archivos físicos — descargar desde Supabase → Storage',
  },

  // ── Suscriptores y contactos ─────────────────────────────────────────────
  {
    table: 'ir_subscribers',      key: 'ir_subscribers',      label: 'Suscriptores IR',
    description: 'Lista de suscriptores a notificaciones de nuevos reportes',
    category: 'contactos', included: true,
  },
  {
    table: 'contact_submissions', key: 'contact_submissions', label: 'Consultas de contacto',
    description: 'Mensajes recibidos por el formulario público de contacto',
    category: 'contactos', included: true,
  },
  {
    table: 'candidatos',           key: 'candidatos',           label: 'Candidatos',
    description: 'Personas que se postularon en la sección Carreras (deduplicadas por email)',
    category: 'contactos', included: true,
    select: 'id, nombre, email, telefono, linkedin, created_at, updated_at',
  },
  {
    table: 'postulaciones',        key: 'postulaciones',        label: 'Postulaciones',
    description: 'Postulaciones recibidas en la sección Carreras',
    category: 'contactos', included: true,
    select: 'id, candidato_id, position_id, area, mensaje, estado, notas, score, ai_summary, created_at, updated_at',
    notes: 'Sin CVs físicos — descargar desde Supabase → Storage',
  },
  {
    table: 'investor_contacts',    key: 'investor_contacts',    label: 'Registro de inversores',
    description: 'Contactos de accionistas actuales y prospectos para futuras colocaciones',
    category: 'contactos', included: true,
  },
  {
    table: 'investor_documents',   key: 'investor_documents',   label: 'Documentos IR internos',
    description: 'Metadata de documentos privados para accionistas',
    category: 'contactos', included: true,
    select: 'id, titulo, descripcion, categoria, file_name, file_size, created_at, updated_at',
    notes: 'Sin archivos físicos — descargar desde Supabase → Storage (bucket investor-documents)',
  },

  // ── No incluido ──────────────────────────────────────────────────────────
  {
    table: 'activity_log',      key: 'activity_log',      label: 'Log de actividad',
    description: 'Log operativo — no necesario para restaurar el sistema',
    category: 'no-incluido', included: false,
  },
  {
    table: 'push_subscriptions', key: 'push_subscriptions', label: 'Push subscriptions',
    description: 'No sobreviven rotación de VAPID keys — usuarios vuelven a suscribirse',
    category: 'no-incluido', included: false,
  },
  {
    table: 'storage', key: 'storage', label: 'Archivos (Storage)',
    description: 'Imágenes y PDFs — descargar bucket por bucket desde Supabase',
    category: 'no-incluido', included: false,
    notes: 'supabase storage download --bucket site-images ./backup-images',
  },
]

export const CATEGORY_LABELS: Record<BackupCategory, string> = {
  cms:           'Configuración CMS',
  acceso:        'Roles y acceso',
  contenido:     'Contenido editorial',
  reportes:      'Reportes',
  biblioteca:    'Biblioteca interna',
  contactos:     'Suscriptores y contactos',
  'no-incluido': 'No incluido en backup',
}

export const CATEGORY_ORDER: BackupCategory[] = [
  'cms', 'acceso', 'contenido', 'reportes', 'biblioteca', 'contactos', 'no-incluido',
]
