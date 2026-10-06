const fs = require('fs');
const ts = require('typescript');
const { jsPDF } = require('jspdf');
const source = fs.readFileSync('app/result/[id]/page.tsx', 'utf8');
let body = source.slice(source.indexOf('  async function download()'), source.indexOf('  async function share()'));
body = body.replace('const { jsPDF } = await import("jspdf");', '');
body = body.replace('await pdf.save(`ncc-escape-${filename}.pdf`, { returnPromise: true });', 'fs.writeFileSync(`.ui-review/result-pdf-${data.status}.pdf`, Buffer.from(pdf.output("arraybuffer")));');
const compiled = ts.transpile(body, {target:ts.ScriptTarget.ES2022});
const formatTime = ms => ms == null ? '00:00' : `${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000)%60 < 10 ? '0' : ''}${Math.floor(ms/1000)%60}`;
const fetch = async () => ({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync('public/ncc-result-template.png');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
const downloading=false;
const setDownloading=()=>{};
const push=(message,type)=>{if(type==='error')throw Error(message);};
(async()=>{
  for(const data of [
    {status:'COMPLETED',participantName:'MINHAJUL ISLAM RIFAT',participantBatch:'16',completionTimeMs:37000,rank:2,prizeEligible:true,prizeClaimed:false},
    {status:'FAILED',participantName:'A Very Long Participant Name For Checking The Result PDF Width',participantBatch:'2026',completionTimeMs:null,rank:null,prizeEligible:false,prizeClaimed:false},
    {status:'IN_PROGRESS',participantName:'Test Participant',participantBatch:'16',completionTimeMs:null,rank:null,prizeEligible:false,prizeClaimed:false}
  ]) {await eval(`(async()=>{${compiled};await download()})()`); console.log('Generated '+data.status);}
})().catch(e=>{console.error(e);process.exitCode=1;});
