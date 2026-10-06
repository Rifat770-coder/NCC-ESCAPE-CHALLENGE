const fs=require('fs');const {spawn}=require('child_process');
const pw=require('C:/Users/Rifat/AppData/Local/Programs/Python/Python314/Lib/site-packages/playwright/driver/package');
const base='http://127.0.0.1:3102';const out='.ui-review/responsive';const report={checks:[],errors:[]};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3102'],{cwd:process.cwd(),env:{...process.env,APPWRITE_API_KEY:'',APPWRITE_DATABASE_ID:'',ADMIN_PASSWORDS:'responsive-test-only'},stdio:'ignore',windowsHide:true});
let browser;
async function json(context,method,url,data){const r=await context.request[method](base+url,data?{data}:undefined);const d=await r.json();if(!r.ok()||!d.ok)throw Error(url+' rejected '+r.status());return d;}
(async()=>{
for(let i=0;i<40;i++){try{if((await fetch(base+'/api/settings')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
for(const engine of ['chromium','webkit']){
 browser=await pw[engine].launch({headless:true});const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true});const page=await context.newPage();
 await page.goto(base+'/admin');await page.locator('input[type=password]').fill('responsive-test-only');await page.getByRole('button',{name:'Continue',exact:true}).tap();await page.waitForURL('**/admin/dashboard');
 for(const duration of [60,80,120]){
  await page.getByRole('button',{name:'Game Settings',exact:true}).tap();await page.getByRole('spinbutton').nth(0).fill(String(duration));await page.getByRole('button',{name:'Save Settings',exact:true}).tap();await page.locator('.modal-overlay').waitFor({state:'hidden'});
  const settings=await json(context,'get','/api/settings');if(settings.settings.durationSeconds!==duration)throw Error('Duration save mismatch');
  const reg=await json(context,'post','/api/register',{name:'Timer '+duration+' '+engine,studentId:'TIMER-'+duration+'-'+Date.now(),department:'Other',batch:'26'});
  await page.goto(base+'/play/'+reg.attempt.id);await page.locator('.hud-timer').waitFor();
  const expected=duration===60?'01:00':duration===80?'01:20':'02:00';await page.locator('.hud-timer').getByText('of '+expected,{exact:true}).waitFor();
  if(duration===60){for(let i=0;i<120;i++){const text=await page.locator('.hud-timer .tabular-nums').textContent();if(!text.trim())throw Error('Timer blank during transition');await page.waitForTimeout(25);}}
  const bounds=await page.locator('.hud-timer').boundingBox();if(bounds.x<0||bounds.x+bounds.width>320)throw Error('Timer outside phone');
  await page.screenshot({path:out+'/'+engine+'/timer-'+duration+'-320x568.png',fullPage:true});report.checks.push({engine,check:'Admin duration '+duration+' displayed as '+expected,pass:true});
  await page.goto(base+'/admin/dashboard');await page.getByRole('button',{name:'Game Settings',exact:true}).waitFor();
 }
 await page.getByRole('button',{name:'Game Settings',exact:true}).tap();const toggles=page.locator('button:has(> span.h-6)');const toggle= toggles.nth(0);await page.waitForTimeout(450);const bounds=await toggle.boundingBox();if(bounds.width<44||bounds.height<44)throw Error('Small toggle target');await toggle.tap();await toggle.tap();await page.getByRole('button',{name:'Save Settings',exact:true}).tap();await page.locator('.modal-overlay').waitFor({state:'hidden'});report.checks.push({engine,check:'Settings toggle touch target and save',pass:true});
 const reg=await json(context,'post','/api/register',{name:'Claim Fixture '+engine,studentId:'CLAIM-'+Date.now(),department:'Other',batch:'26'});const id=reg.attempt.id;
 const start=await json(context,'post','/api/attempt/start',{attemptId:id});
 const matches=Object.fromEntries(start.plan.level3.techPairs.map(p=>[p.left,p.right]));
 for(const [level,payload] of [[1,{bugsCaught:5}],[2,{pairsMatched:3}],[3,{matches,mistakes:0}],[4,{hit:start.plan.level4.targetColor,mistakes:0}]])await json(context,'post','/api/attempt/submit',{attemptId:id,level,payload});
 await page.reload();await page.getByPlaceholder(/Search/).fill('Claim Fixture '+engine);await page.getByRole('button',{name:'Claim',exact:true}).tap();await page.getByRole('button',{name:'Unclaim',exact:true}).waitFor();let d=await json(context,'get','/api/attempt?id='+id);if(!d.attempt.prizeClaimed)throw Error('Claim not persisted');
 await page.getByRole('button',{name:'Unclaim',exact:true}).tap();await page.getByRole('button',{name:'Claim',exact:true}).waitFor();d=await json(context,'get','/api/attempt?id='+id);if(d.attempt.prizeClaimed)throw Error('Unclaim not persisted');report.checks.push({engine,check:'Populated admin table, search, touch claim/unclaim',pass:true});
 const life=await json(context,'post','/api/register',{name:'Lives Fixture '+engine,studentId:'LIVES-'+Date.now(),department:'Other',batch:'26'});await json(context,'post','/api/attempt/start',{attemptId:life.attempt.id});
 for(let i=0;i<3;i++)await json(context,'post','/api/attempt/submit',{attemptId:life.attempt.id,level:1,payload:{bugsCaught:0}});
 await page.goto(base+'/play/'+life.attempt.id);await page.getByRole('heading',{name:'MISSION FAILED',exact:true}).waitFor();const ended=await json(context,'get','/api/attempt?id='+life.attempt.id);if(ended.attempt.livesRemaining!==0||ended.attempt.status!=='FAILED'||ended.attempt.prizeEligible)throw Error('Lives failure regression');report.checks.push({engine,check:'No-lives failure and ineligibility (API fixture, ended-attempt result screen)',pass:true});
 console.log('EXTRAS PASS '+engine+' '+report.checks.filter(x=>x.engine===engine).length+' checks');await browser.close();browser=null;
}
})().catch(e=>{report.errors.push(e.stack);console.error(e.stack);process.exitCode=1}).finally(async()=>{fs.writeFileSync(out+'/extras.json',JSON.stringify(report,null,2));if(browser)await browser.close();server.kill();});
