const {spawn}=require('child_process');
const fs=require('fs');
const pw=require('C:/Users/Rifat/AppData/Local/Programs/Python/Python314/Lib/site-packages/playwright/driver/package');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3103','--hostname','127.0.0.1'],{windowsHide:true,stdio:'ignore'});
const base='http://127.0.0.1:3103';
(async()=>{
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  const report=[];
  for(const engine of ['chromium','webkit']){
    const browser=await pw[engine].launch({headless:true});
    try{
      for(const reducedMotion of ['no-preference','reduce']){
        const context=await browser.newContext({hasTouch:true,reducedMotion});
        const page=await context.newPage();const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.route('**/api/attempt?*',r=>r.fulfill({json:{ok:true,attempt:{id:'animation-check',participantName:'MINHAJUL ISLAM RIFAT',participantBatch:'16',status:'COMPLETED',completionTimeMs:37000,prizeEligible:true,prizeClaimed:false,rank:2}}}));
        for(const width of [320,820,1440]){
          await page.setViewportSize({width,height:900});
          for(const url of ['/','/leaderboard','/result/animation-check']){
            await page.goto(base+url);await page.waitForTimeout(1300);
            if(url.startsWith('/result'))await page.getByRole('button',{name:'Download PDF',exact:true}).waitFor();
            const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
            if(overflow)throw Error(engine+' overflow '+url+' '+width);
            report.push({engine,reducedMotion,width,url,pass:true});
          }
        }
        await page.goto(base);await page.getByRole('button',{name:'Start Challenge',exact:true}).click();await page.locator('#f-name').waitFor();await page.getByRole('button',{name:'Register',exact:true}).click();await page.locator('#f-name[aria-invalid=true]').waitFor();
        if(errors.length)throw Error(JSON.stringify(errors));
        await context.close();
      }
    }finally{await browser.close();}
  }
  fs.writeFileSync('.ui-review/animation-smoke.json',JSON.stringify(report,null,2));console.log(report.length+' animation layout checks passed; registration validation and zero runtime errors in both engines');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
