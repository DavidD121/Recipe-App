import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

// Dev-only storage API: the browser can't write to disk, so GET/PUT on `route`
// reads and writes a JSON file through the dev server. Missing files are
// seeded with an empty array on first read.
function jsonFileApi(route: string, relativePath: string): Plugin {
  const file = resolve(import.meta.dirname, relativePath)

  return {
    name: `json-file-api:${route}`,
    configureServer(server) {
      server.middlewares.use(route, async (req, res, next) => {
        try {
          if (req.method === 'GET') {
            let json = '[]'
            try {
              json = await readFile(file, 'utf8')
            } catch (err) {
              if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
              await mkdir(dirname(file), { recursive: true })
              await writeFile(file, json)
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(json)
            return
          }

          if (req.method === 'PUT') {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            await mkdir(dirname(file), { recursive: true })
            await writeFile(file, JSON.stringify(data, null, 2))
            res.statusCode = 204
            res.end()
            return
          }

          next()
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: (err as Error).message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    jsonFileApi('/api/recipes', 'data/recipes.json'),
    jsonFileApi('/api/shopping-list', 'data/shopping-list.json'),
  ],
})
