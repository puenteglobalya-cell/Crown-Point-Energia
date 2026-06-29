import postgres from 'postgres'

let cachedSql: ReturnType<typeof postgres> | null = null

export function getPostgresClient() {
  if (!cachedSql) {
    let connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      // Construct from Supabase variables
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) throw new Error('DATABASE_URL or SUPABASE credentials not set')

      // Extract host from Supabase URL and build postgres connection string
      const host = new URL(url).hostname
      connectionString = `postgresql://postgres:${key}@${host}:6543/postgres?sslmode=require`
    }

    cachedSql = postgres(connectionString, { max: 1 })
  }
  return cachedSql
}
