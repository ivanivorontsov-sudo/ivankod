// Значок ИванКод: лист иван-чая (кипрея) — узкий длинный лист с жилкой; для крупных размеров — маленький </>
const fs=require('fs'); const {Resvg}=require('/tmp/rv/node_modules/@resvg/resvg-js');
const svg=(small,code=!small)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f08cc0"/><stop offset="1" stop-color="#8a3fa8"/></linearGradient>
<linearGradient id="lf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2f8f3a"/><stop offset="1" stop-color="#8fdc6a"/></linearGradient></defs>
<rect x="${small?4:8}" y="${small?4:8}" width="${small?248:240}" height="${small?248:240}" rx="${small?44:54}" fill="url(#bg)"/>
<g transform="rotate(-42 128 128)">
<path d="M128 ${small?14:22} C ${small?164:152} 70, ${small?164:152} 186, 128 ${small?242:234} C ${small?92:104} 186, ${small?92:104} 70, 128 ${small?14:22} Z" fill="url(#lf)" stroke="#1d5e26" stroke-width="${small?8:5}"/>
<path d="M128 ${small?34:40} Q 134 128 128 ${small?226:220}" fill="none" stroke="#eaffd8" stroke-width="${small?12:7}" stroke-linecap="round"/>
${small?'':`<g stroke="#eaffd8" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".85"><path d="M131 80 L143 68"/><path d="M131 110 L145 96"/><path d="M131 140 L145 126"/><path d="M131 170 L142 160"/><path d="M126 95 L113 83"/><path d="M126 125 L111 111"/><path d="M126 155 L111 142"/><path d="M126 185 L115 176"/></g>`}
</g>
${!code?'':`<g transform="translate(150 178)"><rect x="0" y="0" width="92" height="56" rx="16" fill="#2a1d38" opacity=".88"/><text x="46" y="39" font-family="DejaVu Sans Mono,monospace" font-weight="bold" font-size="30" fill="#ffffff" text-anchor="middle">&lt;/&gt;</text></g>`}
</svg>`;
fs.writeFileSync('icon.svg',svg(false)); fs.writeFileSync('icon-small.svg',svg(true));
const png=(s,sz)=>new Resvg(s,{fitTo:{mode:'width',value:sz},font:{loadSystemFonts:true}}).render().asPng();
const sizes=[16,24,32,48,64,128,256]; const imgs=sizes.map(z=>png(svg(z<=32,z>=64),z)); sizes.forEach((z,i)=>fs.writeFileSync('icon-'+z+'.png',imgs[i]));
// ICO: PNG внутри (Vista+), все размеры
const hdr=Buffer.alloc(6); hdr.writeUInt16LE(0,0); hdr.writeUInt16LE(1,2); hdr.writeUInt16LE(sizes.length,4); const dir=[]; let off=6+16*sizes.length;
sizes.forEach((z,i)=>{ const e=Buffer.alloc(16); e[0]=z>=256?0:z; e[1]=z>=256?0:z; e.writeUInt16LE(1,4); e.writeUInt16LE(32,6); e.writeUInt32LE(imgs[i].length,8); e.writeUInt32LE(off,12); off+=imgs[i].length; dir.push(e) });
fs.writeFileSync('../icon.ico',Buffer.concat([hdr,...dir,...imgs])); fs.writeFileSync('../../app/icon.png',png(svg(false),512)); fs.writeFileSync('../../app/icon.svg',svg(false));
// превью: все размеры рядом, крупно
console.log('ok');
