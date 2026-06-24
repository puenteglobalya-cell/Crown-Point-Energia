// Central registry of all sections in the app.
// Add one entry here whenever a new route is created.

export type SiteArea = 'public' | 'portal' | 'admin' | 'biblioteca'

export type SiteSection = {
  path: string
  label: string
  description: string
  area: SiteArea
  roles?: string[]   // who can access; omit = everyone
  notes?: string     // optional extra info shown in sitemap
}

export const SITE_SECTIONS: SiteSection[] = [

  // ── Sitio público ────────────────────────────────────────────────────────
  {
    path: '/',
    label: 'Home',
    area: 'public',
    description: 'Portada con hero image, KPIs (producción, reservas, EBITDA, bloques), strip de cuencas, cotización, últimos comunicados y contacto.',
  },
  {
    path: '/operaciones',
    label: 'Operaciones',
    area: 'public',
    description: 'Detalle de bloques operados, mapa de Argentina con ubicaciones y producción por área.',
  },
  {
    path: '/esg',
    label: 'ESG / Sostenibilidad',
    area: 'public',
    description: 'Métricas ambientales, sociales y de gobernanza.',
  },
  {
    path: '/acerca',
    label: 'Acerca de',
    area: 'public',
    description: 'Historia y equipo directivo de Crown Point.',
  },
  {
    path: '/inversores',
    label: 'Inversores',
    area: 'public',
    description: 'Cotización en bolsa, documentos para accionistas y panel de métricas financieras.',
  },
  {
    path: '/comunicados',
    label: 'Comunicados',
    area: 'public',
    description: 'Press releases y noticias corporativas.',
  },
  {
    path: '/contacto',
    label: 'Contacto',
    area: 'public',
    description: 'Formulario de contacto y datos institucionales.',
  },
  {
    path: '/maintenance',
    label: 'Mantenimiento',
    area: 'public',
    description: 'Página de sitio en mantenimiento. Se activa desde Admin → CMS.',
    notes: 'Solo visible cuando maintenance=true en cms_settings.',
  },

  // ── Portal interno ────────────────────────────────────────────────────────
  {
    path: '/portal/login',
    label: 'Login',
    area: 'portal',
    description: 'Acceso al portal interno con email y contraseña. Incluye flujo de recuperación de contraseña.',
  },
  {
    path: '/portal',
    label: 'Reportes',
    area: 'portal',
    roles: ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'],
    description: 'Lista de reportes publicados (ventas estimadas, facturación, producción, etc.). Filtrables por tipo.',
  },
  {
    path: '/portal/dashboard',
    label: 'Dashboard',
    area: 'portal',
    roles: ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'],
    description: 'Gráficos de ingresos del último reporte, KPIs consolidados y listado de reportes recientes.',
  },
  {
    path: '/portal/comercial',
    label: 'Comercial',
    area: 'portal',
    roles: ['viewer', 'uploader', 'admin', 'accionista'],
    description: 'Reportes comerciales agrupados + forecast de precios Brent/Henry Hub + tabla de referencia Secretaría de Energía.',
  },
  {
    path: '/portal/subir',
    label: 'Subir reporte',
    area: 'portal',
    roles: ['uploader', 'admin'],
    description: 'Carga de archivos Excel que se parsean y publican en el portal.',
  },
  {
    path: '/portal/mi-cuenta',
    label: 'Mi cuenta',
    area: 'portal',
    roles: ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'],
    description: 'Cambio de contraseña personal del usuario autenticado.',
  },
  {
    path: '/portal/reset-password',
    label: 'Resetear contraseña',
    area: 'portal',
    description: 'Página de destino del link enviado por email para establecer o recuperar contraseña.',
    notes: 'Accesible sin sesión activa.',
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  {
    path: '/admin',
    label: 'Dashboard admin',
    area: 'admin',
    roles: ['admin'],
    description: 'Panel de acceso rápido a todas las secciones de administración.',
  },
  {
    path: '/admin/upload',
    label: 'Subir reportes',
    area: 'admin',
    roles: ['admin'],
    description: 'Carga de Excel → parseo automático → generación de HTML → publicación en portal.',
  },
  {
    path: '/admin/reportes',
    label: 'Gestionar reportes',
    area: 'admin',
    roles: ['admin'],
    description: 'Lista de todos los reportes: publicar, despublicar, previsualizar o eliminar.',
  },
  {
    path: '/admin/usuarios',
    label: 'Usuarios',
    area: 'admin',
    roles: ['admin'],
    description: 'Alta de usuarios, asignación de roles, control de permisos por sección, contraseña provisional y acceso a reportes para accionistas.',
  },
  {
    path: '/admin/imagenes',
    label: 'Imágenes',
    area: 'admin',
    roles: ['admin'],
    description: 'Gestión de imágenes del sitio por sección. Las fotos de la sección Hero se publican automáticamente en el sitio público al subirse.',
  },
  {
    path: '/admin/bloques-fotos',
    label: 'Fotos de bloques',
    area: 'admin',
    roles: ['admin'],
    description: 'Fotos asignadas a cada bloque operativo (Tordillo, Coiron Amargo, etc.).',
  },
  {
    path: '/admin/cms',
    label: 'CMS',
    area: 'admin',
    roles: ['admin'],
    description: 'Control del sitio público: cotización en tiempo real, KPIs, idioma, tema visual, visibilidad de secciones y modo mantenimiento.',
  },
  {
    path: '/admin/sitemap',
    label: 'Sitemap',
    area: 'admin',
    roles: ['admin'],
    description: 'Mapa de todas las secciones del sistema con sus descripciones y permisos. Esta misma página.',
  },
  {
    path: '/admin/rrhh',
    label: 'RRHH',
    area: 'admin',
    roles: ['admin', 'rrhh'],
    description: 'Sección de recursos humanos. Accesible también para el rol rrhh sin acceso al resto del admin.',
  },

  // ── Biblioteca ────────────────────────────────────────────────────────────
  {
    path: '/biblioteca',
    label: 'Biblioteca',
    area: 'biblioteca',
    roles: ['viewer', 'uploader', 'admin', 'rrhh', 'accionista'],
    description: 'Documentos internos organizados por grupos. El acceso a cada grupo se configura por usuario desde Admin → Usuarios.',
  },
]

export const AREA_LABELS: Record<SiteArea, string> = {
  public:    'Sitio público',
  portal:    'Portal interno',
  admin:     'Administración',
  biblioteca: 'Biblioteca',
}

export const AREA_ORDER: SiteArea[] = ['public', 'portal', 'admin', 'biblioteca']
