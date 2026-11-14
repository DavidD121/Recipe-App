// Defaults match database/docker-compose.yml, so local dev needs no .env.
export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://recipe:recipe@localhost:5432/recipe_app',
  port: Number(process.env.PORT ?? 3000),
}
