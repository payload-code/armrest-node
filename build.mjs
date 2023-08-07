import esbuild from 'esbuild'
import fs from 'fs'

esbuild
    .build({
        entryPoints: ['src/armrest.js'],
        outdir: 'lib/esm',
        bundle: true,
        sourcemap: true,
        minify: true,
        splitting: true,
        format: 'esm',
        target: ['esnext']
    })
    .catch(() => process.exit(1));


fs.writeFile('lib/esm/package.json', '{"type":"module"}', function (err) {
  if (err) throw err;
});

esbuild
    .build({
        entryPoints: ['src/armrest.js'],
        outdir: 'lib/cjs',
        bundle: true,
        sourcemap: true,
        minify: true,
        platform: 'node',
        target: ['node10.4'],
    })
    .catch(() => process.exit(1));

fs.writeFile('lib/cjs/package.json', '{"type":"commonjs"}', function (err) {
  if (err) throw err;
});
