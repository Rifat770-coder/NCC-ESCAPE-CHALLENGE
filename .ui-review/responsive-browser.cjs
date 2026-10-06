const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const playwright = require('C:/Users/Rifat/AppData/Local/Programs/Python/Python314/Lib/site-packages/playwright/driver/package');
const engine = process.argv[2] || 'chromium';
const chromium = playwright[engine];
const port = engine === 'webkit' ? 3101 : 3100;
const base = 'http://127.0.0.1:'+port;
const out = '.ui-review/responsive/'+engine;
fs.mkdirSync(out,{recursive:true});
const sizes = [[320,568],[360,640],[375,667],[390,844],[393,852],[412,915],[430,932],[600,960],[768,1024],[820,1180],[1024,1366],[1280,720],[1366,768],[1440,900],[1536,864],[1920,1080],[344,740],[700,900],[1100,800],[568,320],[844,390]];
const report = { viewports:[], flows:[], errors:[], consoleErrors:[], runtimeErrors:[], httpFailures:[] };
const server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,APPWRITE_API_KEY:'',APPWRITE_DATABASE_ID:'',ADMIN_PASSWORDS:'responsive-test-only'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
let browser;
const save=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
async function waitServer(){for(let i=0;i<40;i++){try{const r=await fetch(base+'/api/settings');if(r.ok) return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Test server not ready: '+logs.slice(-1000));}
async function tap(page,locator){await locator.tap({timeout:10000});const timer=page.locator('.hud-timer');if(await timer.count()){const b=await timer.boundingBox();if(b.y<0||b.y+b.height>page.viewportSize().height)throw Error('Timer left viewport during touch interaction');}}
async function audit(page,stage){
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});await page.waitForTimeout(180);
  const result=await page.evaluate(()=>{
   const width=document.documentElement.clientWidth;
   const overflow=document.documentElement.scrollWidth>width+1;
   const controls=[...document.querySelectorAll('button,input,select,a')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('.overflow-x-auto');});
   const clipped=controls.filter(el=>{const r=el.getBoundingClientRect();return r.left < -1 || r.right>width+1;}).map(el=>({text:(el.textContent||el.getAttribute('aria-label')||el.tagName).trim().slice(0,60),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
   const hud=document.querySelector('.game-hud');
   const player= hud?.querySelector('.hud-player'); const timer=hud?.querySelector('.hud-timer');
   return {overflow,scrollWidth:document.documentElement.scrollWidth,width,clipped,playerVisible:!hud||!!player?.getBoundingClientRect().height,timerVisible:!hud||!!timer?.getBoundingClientRect().height};
  });
  const pass=!result.overflow&&!result.clipped.length&&result.playerVisible&&result.timerVisible;
  report.viewports.push({stage,width,height,pass,...result});
  await page.screenshot({path:path.join(out,`${stage}-${width}x${height}.png`),fullPage:true});
  if(!pass) console.log('FAIL '+stage+' '+width+'x'+height+' '+JSON.stringify(result));
 }
 save();console.log('AUDITED '+stage+' '+sizes.length+' viewports');
 await page.setViewportSize({width:320,height:568});await page.waitForTimeout(180);
}
(async()=>{
 await waitServer();
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,acceptDownloads:true});
 const page=await context.newPage();
 page.on('response',r=>{if(r.status()>=400)report.httpFailures.push({url:r.url(),status:r.status()});});
 page.on('pageerror',e=>report.runtimeErrors.push({message:e.message,stack:e.stack,url:page.url()})); page.on('requestfailed',r=>{(report.requestFailures??=[]).push({url:r.url(),error:r.failure(),page:page.url()});});
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 await page.goto(base+'/admin');await page.locator('input[type=password]').waitFor();await audit(page,'admin-login');await page.locator('input[type=password]').fill('responsive-test-only');await tap(page,page.getByRole('button',{name:'Continue',exact:true}));await page.waitForURL('**/admin/dashboard');
 await page.getByRole('button',{name:'Game Settings',exact:true}).waitFor();
 await audit(page,'admin');
 await tap(page,page.getByRole('button',{name:'Game Settings',exact:true}));await page.getByRole('button',{name:'Save Settings',exact:true}).waitFor();await audit(page,'settings-modal');
 await page.getByRole('spinbutton').nth(0).fill('600');await tap(page,page.getByRole('button',{name:'Save Settings',exact:true}));await page.locator('.modal-overlay').waitFor({state:'hidden'});
 report.flows.push('Admin login and settings save (isolated in-memory test server)');
 await tap(page,page.getByRole('button',{name:'Log out',exact:true}));await page.waitForURL('**/admin');report.flows.push('Logout');
 await page.goto(base);await page.waitForTimeout(900);await audit(page,'landing');
 await tap(page,page.getByRole('button',{name:'Mission Rules',exact:true}));await page.getByRole('button',{name:'Close dialog',exact:true}).waitFor();await audit(page,'rules-modal');
 await tap(page,page.getByRole('button',{name:'Close dialog',exact:true}));await page.locator('.modal-overlay').waitFor({state:'hidden'});await tap(page,page.getByRole('button',{name:'Mission Rules',exact:true}));report.flows.push('Modal close and reopen by touch');
 await tap(page,page.getByRole('button',{name:/I Understand/}));await page.locator('#f-name').waitFor();await audit(page,'registration');
 await tap(page,page.getByRole('button',{name:'Register',exact:true}));await page.locator('#f-name[aria-invalid=true]').waitFor();report.flows.push('Registration validation');
 await page.locator('#f-name').fill('Responsive Audit Long Player Name For Narrow Phone');await page.locator('#f-sid').fill('RESPONSIVE-'+Date.now());await page.locator('#f-dep').selectOption({index:1});await page.locator('#f-batch').selectOption({index:1});
 let plan;page.on('response',async r=>{if(r.url().endsWith('/api/attempt/start')){try{const d=await r.json();if(d.plan)plan=d.plan;}catch{}}});
 await tap(page,page.getByRole('button',{name:'Register',exact:true}));await page.waitForURL('**/play/**');await page.getByRole('button',{name:'Bug! Tap to catch',exact:true}).waitFor();report.flows.push('Start challenge and registration navigation');
 await audit(page,'level1');
 for(let i=0;i<35;i++){if(!await page.getByRole('button',{name:'Bug! Tap to catch',exact:true}).count()){if(await page.getByText('Memory Match',{exact:true}).count())break;await page.waitForTimeout(100);continue;}const bug=page.getByRole('button',{name:'Bug! Tap to catch',exact:true});try{await tap(page,bug);}catch{}await page.waitForTimeout(100);}
 await page.getByText('Memory Match',{exact:true}).waitFor();report.flows.push('Level 1 touch completion');await audit(page,'level2');
 const cards=page.getByRole('button',{name:'Memory card',exact:true});const texts=await cards.allTextContents();const pairs={};texts.forEach((t,i)=>{(pairs[t]??=[]).push(i)});
 for(const indices of Object.values(pairs)){for(const index of indices){await tap(page,page.locator('button[aria-label="Memory card"],button[aria-label^="Matched "]').nth(index));await page.waitForTimeout(80);}await page.waitForTimeout(600);}
 await page.getByText('Connect Tech',{exact:true}).waitFor();report.flows.push('Level 2 touch completion and Level 2 -> Level 3 transition');await audit(page,'level3');
 if(!plan)throw Error('Game plan response missing');
 for(const pair of plan.level3.techPairs){await tap(page,page.getByRole('button',{name:pair.left,exact:true}).first());await tap(page,page.getByRole('button',{name:pair.right,exact:true}).last());}
 await page.getByText('NCC FINAL CORE',{exact:true}).waitFor();report.flows.push('Level 3 touch matching completion');
 await page.getByRole('button',{name:new RegExp('^'+plan.level4.targetColor.toUpperCase())}).waitFor({state:'visible'});await audit(page,'level4');
 const target=page.getByRole('button',{name:new RegExp('^'+plan.level4.targetColor.toUpperCase())});await target.waitFor();await tap(page,target);
 await page.getByRole('link',{name:'View Result Card',exact:true}).waitFor();report.flows.push('Level 4 touch color selection and mission completion');await audit(page,'success');
 await tap(page,page.getByRole('link',{name:'View Result Card',exact:true}));await page.getByRole('button',{name:'Download PDF',exact:true}).waitFor();await audit(page,'result');
 const completedId=page.url().split('/').pop();const completed=await (await context.request.get(base+'/api/attempt?id='+completedId)).json();if(completed.attempt.status!=='COMPLETED'||!completed.attempt.prizeEligible||completed.attempt.livesRemaining!==3)throw Error('Completion/prize/lives regression');report.flows.push('Prize eligibility and lives confirmed from real API result');
 const downloadPromise=page.waitForEvent('download');await tap(page,page.getByRole('button',{name:'Download PDF',exact:true}));const download=await downloadPromise;await download.saveAs(path.join(out,'result.pdf'));report.flows.push('Result PDF download');
 await tap(page,page.getByRole('link',{name:'Leaderboard',exact:true}));await page.getByText('FULL RANKING',{exact:true}).waitFor();await audit(page,'leaderboard');report.flows.push('Leaderboard navigation and real completion data');
 await page.goto(base+'/admin');await page.locator('input[type=password]').fill('responsive-test-only');await tap(page,page.getByRole('button',{name:'Continue',exact:true}));await page.waitForURL('**/admin/dashboard');
 const settingsResponse=await context.request.post(base+'/api/admin/settings',{data:{durationSeconds:30}});if(!settingsResponse.ok())throw Error('Isolated failure-test settings rejected');
 await page.goto(base);await tap(page,page.getByRole('button',{name:'Start Challenge',exact:true}));await page.locator('#f-name').fill('Responsive Failure Test');await page.locator('#f-sid').fill('FAIL-'+Date.now());await page.locator('#f-dep').selectOption({index:1});await page.locator('#f-batch').selectOption({index:1});await tap(page,page.getByRole('button',{name:'Register',exact:true}));await page.waitForURL('**/play/**');await page.getByRole('heading',{name:'MISSION FAILED',exact:true}).waitFor({timeout:45000});await audit(page,'failure');report.flows.push('Real server timer expiry and failure screen');
 console.log('COMPLETE '+engine+' '+report.viewports.length+' layout cases; failures='+report.viewports.filter(x=>!x.pass).length+'; runtime errors='+report.runtimeErrors.length);if(report.viewports.some(x=>!x.pass)||report.runtimeErrors.length)process.exitCode=1;
})().catch(e=>{report.errors.push(e.stack);console.error(e.stack);process.exitCode=1;}).finally(async()=>{save();if(browser)await browser.close();server.kill();});

