import postgres from 'postgres'

let cachedSql: ReturnType<typeof postgres> | null = null

export function getPostgresClient() {
  if (!cachedSql) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL not set')
    cachedSql = postgres(connectionString, { max: 1 })
  }
  return cachedSql
}
