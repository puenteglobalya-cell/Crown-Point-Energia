# Revenue App

Dashboard de ingresos estimados — Petróleo & Gas.

## Stack
- **Next.js 14** (App Router)
- **Supabase Auth** (magic link)
- **Vercel** (deploy)

## Setup local

```bash
# 1. Clonar e instalar
git clone <repo>
cd revenue-app
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Completar con los valores de tu proyecto Supabase

# 3. Correr en desarrollo
npm run dev
```

## Configurar Supabase

1. Ir a **supabase.com** → tu proyecto → **Authentication → URL Configuration**
2. Agregar en **Site URL**: `http://localhost:3000` (dev) y tu dominio de Vercel (prod)
3. Agregar en **Redirect URLs**: `https://tu-app.vercel.app/auth/callback`
4. Para invitar usuarios: **Authentication → Users → Invite user**

## Deploy en Vercel

```bash
# Conectar repo en vercel.com
# Agregar las variables de entorno:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Agregar un nuevo reporte mensual

1. Crear `components/reportes/junio-2026.tsx` (copiar mayo-2026.tsx y actualizar datos)
2. Importar y registrar en `app/reportes/[slug]/page.tsx`
3. Agregar la entrada en el array `reportes` de `app/page.tsx`
4. Commit + push → Vercel deploya automáticamente

## Gestión de usuarios

Desde **Supabase → Authentication → Users**:
- **Invite user**: manda un magic link de bienvenida
- **Delete user**: revoca el acceso inmediatamente
- No necesitás tocar código para agregar/quitar personas
