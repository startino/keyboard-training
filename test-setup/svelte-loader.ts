import { plugin } from 'bun'
import { compileModule } from 'svelte/compiler'
import { readFileSync } from 'fs'

// Register a bun loader for *.svelte.ts files so that runes ($state, $derived,
// $effect, $props) work in plain TypeScript modules during bun test.
// Pipeline: read source -> bun transpile (strip TS) -> svelte compileModule (lower runes).
const transpiler = new Bun.Transpiler({ loader: 'ts' })

plugin({
  name: 'svelte-runes-loader',
  setup(build) {
    build.onLoad({ filter: /\.svelte\.ts$/ }, ({ path }) => {
      const source = readFileSync(path, 'utf8')
      const stripped = transpiler.transformSync(source)
      const { js } = compileModule(stripped, {
        filename: path,
        generate: 'client',
        dev: false,
      })
      return {
        contents: js.code,
        loader: 'js',
      }
    })
  },
})
