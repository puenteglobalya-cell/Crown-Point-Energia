-- CSS personalizado inyectado en el <head> del sitio público (no en
-- /portal ni /admin). Pensado para que un rol externo como Diseño Web
-- pueda afinar diseño (colores, espaciados, tipografía puntual) sin
-- necesitar acceso al repositorio de código.
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS custom_css TEXT NOT NULL DEFAULT '';
