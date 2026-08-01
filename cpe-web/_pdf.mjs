import { chromium } from 'playwright'
const SP='/tmp/claude-0/-home-user-Crown-Point-Energia/1b18d3a0-d571-536a-b24a-52e1e8d24940/scratchpad'
const b = await chromium.launch()
const p = await b.newPage()
await p.goto('file://'+SP+'/informe.html', { waitUntil: 'load' })
await p.pdf({ path: SP+'/informe.pdf', format: 'A4', printBackground: true, margin:{top:'14mm',bottom:'14mm',left:'12mm',right:'12mm'} })
await p.emulateMedia({ media: 'print' })
await p.setViewportSize({ width: 900, height: 1400 })
await p.screenshot({ path: SP+'/informe-p1.png', clip: { x:0, y:0, width:900, height:1250 } })
await b.close()
console.log('PDF y captura generados')
