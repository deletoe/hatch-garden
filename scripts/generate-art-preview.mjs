import { readFile, writeFile } from 'node:fs/promises';

const rows = [
  ['佩奇', ['peppa-idle','peppa-walk-a','peppa-walk-b','peppa-jump'].map(name=>['characters/'+name+'.svg',name.split('-').slice(1).join('-')])],
  ['乔治', ['george-idle','george-walk-a','george-walk-b','george-jump'].map(name=>['characters/'+name+'.svg',name.split('-').slice(1).join('-')])],
  ['疯狂小鸡', ['idle','blink','walk-a','walk-b','lay','happy'].map(pose=>['characters/hen-'+pose+'.svg',pose])],
  ['幼鸡 / 蛋', [...['idle','walk-a','walk-b','hatch'].map(pose=>['characters/chick-'+pose+'.svg',pose]),['eggs/egg-whole.svg','whole'],['eggs/egg-crack-1.svg','crack-1']]],
  ['裂纹 / 蛋壳', [['eggs/egg-crack-2.svg','crack-2'],['eggs/shell-top.svg','shell-top'],['eggs/shell-bottom.svg','shell-bottom']]],
];
let body = '<rect width="1320" height="1300" fill="#F7F4ED"/><text x="45" y="58" font-size="30" font-weight="bold" fill="#493954">参考重绘 · SVG 美术资源</text><text x="45" y="91" font-size="16" fill="#776B80">按游戏比例与脚部锚点展示；佩奇头部后移，乔治整体略小，不带助听器。</text>';
for (const [row,[label,assets]] of rows.entries()) {
  const y=125+row*226;
  body+=`<text x="38" y="${y+93}" font-size="20" fill="#493954">${label}</text>`;
  for(const [column,[path,pose]] of assets.entries()){
    const x=170+column*186;
    let svg=await readFile(new URL('../art/'+path,import.meta.url),'utf8');
    const viewBox=svg.match(/viewBox="([^"]+)"/)[1];
    const [, , width, height]=viewBox.split(' ').map(Number);
    const characterScale=path.includes('peppa-') ? .9 : path.includes('george-') ? .63 : path.includes('hen-') ? .63 : path.includes('chick-') ? .76 : .55;
    const scale=characterScale*.86;
    const anchorY=path.includes('chick-') ? 112 : path.startsWith('eggs/') ? 104 : 228;
    svg=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
    body+=`<rect x="${x}" y="${y}" width="172" height="205" rx="16" fill="#FFF"/><svg x="${x+86-width/2*scale}" y="${y+176-anchorY*scale}" width="${width*scale}" height="${height*scale}" viewBox="${viewBox}" fill="none">${svg}</svg><text x="${x+86}" y="${y+190}" text-anchor="middle" font-size="14" fill="#776B80">${pose}</text>`;
  }
}
body+='<text x="45" y="1280" font-size="14" fill="#776B80">参考来源和绘制说明见 art/REFERENCE_SOURCES.md；本图为新 SVG 的直接渲染。</text>';
await writeFile(new URL('../design/previews/reference-redraw.svg',import.meta.url),'<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1300" viewBox="0 0 1320 1300" font-family="PingFang SC,Microsoft YaHei,sans-serif">'+body+'</svg>\n');
