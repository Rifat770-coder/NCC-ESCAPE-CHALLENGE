const fs = require('fs');
(async()=>{
const routes=['/','/leaderboard','/admin','/admin/dashboard','/play/ui-review-missing','/result/ui-review-missing'];
const results=await Promise.all(routes.map(async path=>{const r=await fetch('http://127.0.0.1:3001'+path);const html=await r.text();return {path,status:r.status,html:html.includes('<html'),errorPage:html.includes('Internal Server Error')};}));
for(const path of ['/api/settings','/api/leaderboard','/api/admin/stats','/api/admin/settings']) {const r=await fetch('http://127.0.0.1:3001'+path);let d;try{d=await r.json()}catch{d={}}results.push({path,status:r.status,ok:d.ok,error:d.error});}
const r=await fetch('http://127.0.0.1:3001/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});results.push({path:'/api/register (invalid input)',status:r.status});
fs.writeFileSync('.ui-review/routes.json',JSON.stringify(results,null,2)); console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
