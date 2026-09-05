import {chromium} from '@playwright/test';import{writeFile}from'node:fs/promises';
const results=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
await page.goto('http://127.0.0.1:4173/');await page.locator('canvas').waitFor();await page.locator('canvas').scrollIntoViewIfNeeded();
const box=await page.locator('canvas').boundingBox(),cdp=await context.newCDPSession(page);let x=box.x+box.width*.6,y=box.y+box.height*.4;
const state=()=>page.evaluate(()=>({phase:document.querySelector('#phase-label').textContent,shots:document.querySelector('#shot-number').textContent,damage:document.querySelector('#damage').textContent}));
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(200);results.push({case:'touchcancel',state:await state()});
// If a cancelled gesture leaves a pending press, a later release in the canvas must not launch.
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.5,y:box.y+box.height*.08}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);results.push({case:'tap non-shootable launcher after cancel',state:await state()});
await page.screenshot({path:'artifacts/audit/touchcancel.png',fullPage:true});
for(const [width,height] of [[820,600],[375,667]]){
 await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4173/');await page.locator('canvas').waitFor();await page.locator('#launch').click();await page.waitForTimeout(450);
 results.push({case:'flight viewport',width,height,state:await page.evaluate(()=>{const b=document.querySelector('.board-panel').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect(),a=document.querySelector('.action-row').getBoundingClientRect();return{height:innerHeight,boardTop:b.top,boardBottom:b.bottom,canvasTop:c.top,canvasBottom:c.bottom,actionTop:a.top,scrollY}})});
 await page.screenshot({path:`artifacts/audit/flight-${width}x${height}.png`});
}
await browser.close();
const headed=await chromium.launch({channel:'chrome',headless:false});const hc=await headed.newContext();const game=await hc.newPage();await game.goto('http://127.0.0.1:4173/');await game.locator('canvas').waitFor();await game.locator('#launch').click();
const other=await hc.newPage();await other.goto('about:blank');await other.bringToFront();await new Promise(resolve=>setTimeout(resolve,800));
results.push({case:'real headed background',state:await game.evaluate(()=>({hidden:document.hidden,phase:document.querySelector('#phase-label').textContent,dialog:document.querySelector('#modal').open}))});
await other.close();await game.bringToFront();await game.getByRole('button',{name:'继续实验',exact:false}).click({timeout:3000}).catch(e=>results.push({case:'resume missing',error:e.message}));
results.push({case:'real headed return',state:await game.evaluate(()=>({hidden:document.hidden,phase:document.querySelector('#phase-label').textContent,dialog:document.querySelector('#modal').open}))});await headed.close();
await writeFile('artifacts/audit/input-boundaries.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
