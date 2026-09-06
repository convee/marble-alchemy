import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>results.push({error:e.message}));
const ready=async()=>{await page.goto('http://127.0.0.1:4173/');await page.locator('canvas').waitFor();};
const ui=()=>page.evaluate(()=>({phase:document.querySelector('#phase-label').textContent,shots:document.querySelector('#shot-number').textContent,damage:document.querySelector('#damage').textContent,dialog:document.querySelector('#modal').open,title:document.querySelector('#modal-title')?.textContent,focus:document.activeElement?.id}));
await ready();await page.locator('#help').click();await page.locator('#help-close').click();await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
results.push({case:'keyboard after help',state:await ui()});
await ready();let box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+box.width*.6,box.y+box.height*.4,{button:'right'});await page.waitForTimeout(200);results.push({case:'right mouse click',state:await ui()});
await ready();box=await page.locator('canvas').boundingBox();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x-50,box.y+box.height*.4);await page.mouse.up();await page.waitForTimeout(100);results.push({case:'drag release outside',state:await ui()});
for(const [width,height] of [[1440,900],[1024,768],[821,600],[820,600],[390,844],[375,667],[320,568],[844,390]]){
 await page.setViewportSize({width,height});await ready();
 const metrics=await page.evaluate(()=>{let b=document.querySelector('#game').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect(),l=document.querySelector('#launch').getBoundingClientRect();return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canvas:[c.x,c.y,c.width,c.height],parent:[b.x,b.y,b.width,b.height],button:[l.x,l.y,l.width,l.height]}});
 results.push({case:'viewport',width,height,...metrics});await page.screenshot({path:`artifacts/audit/viewport-${width}x${height}.png`,fullPage:true});
}
await writeFile('artifacts/audit/exploratory.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
