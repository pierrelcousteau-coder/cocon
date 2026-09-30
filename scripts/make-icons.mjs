import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
const p = (f) => fileURLToPath(new URL(`../public/${f}`, import.meta.url))
for (const size of [180, 192, 512]) {
  await sharp(p('icon.svg')).resize(size, size).png().toFile(p(`icon-${size}.png`))
}
console.log('icons ok')
