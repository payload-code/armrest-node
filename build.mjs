import esbuild from 'esbuild'
import { promises as fs } from 'fs'

async function build(packageType) {
  const type = packageType === 'module' ? 'mjs' : 'cjs'

  const buildParams = {
    entryPoints: ['src/armrest.js'],
    bundle: true,
    sourcemap: true,
    minify: true,
    outdir: `lib/${type}`,
  }

  if (packageType === 'module') {
    Object.assign(buildParams, {
      splitting: true,
      format: 'esm',
      target: ['esnext'],
    })
  } else if (packageType === 'commonjs') {
    Object.assign(buildParams, {
      platform: 'node',
      target: ['node10.4'],
    })
  } else { throw Error('Unknown type') }

  await esbuild.build(buildParams)

  await fs.writeFile(`lib/${type}/package.json`, `{"type": "${packageType}"}`)
}

build('module')

build('commonjs')
