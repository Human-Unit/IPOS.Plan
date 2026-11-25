import { chromium, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const base = "http://127.0.0.1:3105";
const rounds = 5;
function upperMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const upperMiddle = sorted[Math.floor(sorted.length / 2)];
  return Math.round(upperMiddle * 10) / 10;
}
async function seed(page) {
  return page.evaluate(async () => {
    const storeName = "ipos-content-plans";
    const database = await new Promise((resolve,reject) => {
      const open = indexedDB.open(storeName);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const all=()=>new Promise((resolve,reject)=>{
      const request = database.transaction("plans").objectStore("plans").index("updatedAt").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const seed=(await all())[0];
    const write=database.transaction("plans","readwrite");
    const dbStart=performance.now();
    const plans=write.objectStore("plans");
    for (let i=0;i<100;i++) {
      plans.put({
        ...seed,id:"baseline-fixture-"+i,title:"Контрольная запись № " + String(i).padStart(3,"0"),
        updatedAt:new Date(Date.UTC(2026,0,1,0,0,i)).toISOString(),
      });
    }
    await new Promise((resolve, reject) => {
      write.oncomplete = resolve;
      write.onerror = () => reject(write.error);
      write.onabort = () => reject(write.error);
    });
    const writeMs=performance.now()-dbStart;
    const reads=[];
    for(let i=0;i<5;i++) {
      const mark = performance.now();
      await all();
      reads.push(performance.now() - mark);
    }
    database.close();
    return {writeMs, reads};
  });
}
const decodedJs=page=>page.evaluate(()=>performance.getEntriesByType("resource")
  .filter(entry=>entry.name.startsWith(location.origin)&&entry.name.endsWith(".js"))
  .reduce((sum,entry)=>sum+entry.decodedBodySize,0));
async function heap(session) {
  const {metrics}=await session.send("Performance.getMetrics");
  return Math.round(metrics.find(metric=>metric.name==="JSHeapUsedSize").value / 1024);
}
async function bench(browser, viewport, image) {
  const context = await browser.newContext({viewport,reducedMotion:"reduce"});
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    await page.goto(base);
    const list = page.locator(".plan-row");
    await list.first().waitFor();
    const url=new URL(await page.locator(".plan-title").first().getAttribute("href"),base).href;
    const db = await seed(page);
    const dashboard = [], search = [], editor = [], dashboardHeap=[], editorHeap=[];
    let dashboardBytes = 0, editorBytes=0;
    for(let i=0;i<rounds;i++) {
      const start = performance.now();
      await page.goto(base);
      await expect(list).toHaveCount(101);
      dashboard.push(performance.now() - start);
      dashboardBytes = await decodedJs(page);
      dashboardHeap.push(await heap(cdp));
      const input=page.getByRole("searchbox",{name:"Поиск планов"});
      const query = performance.now();
      await input.fill("Контрольная запись № 042");
      await expect(list).toHaveCount(1);
      search.push(performance.now() - query);
      const load = performance.now();
      await page.goto(url);
      await page.locator(".bn-editor").waitFor();
      editor.push(performance.now() - load);
      editorBytes = await decodedJs(page);
      editorHeap.push(await heap(cdp));
    }
    let imageMs=null;
    if (image) {
      const first=page.getByRole("region",{name:"Задача: Подготовить текст анонса",exact:true});
      const file=first.getByRole("button",{name:"Файл",exact:true});
      const select=page.waitForEvent("filechooser");
      await file.click();
      const load=performance.now();
      await (await select).setFiles({name:"phase2-fixture.png",mimeType:"image/png",buffer:image});
      await expect(page.getByRole("img",{name:"phase2-fixture.png",exact:true})).toBeVisible();
      imageMs=performance.now() - load;
    }
    return {
      viewport,
      milliseconds: {
        dashboard: upperMedian(dashboard.slice(1)),
        search: upperMedian(search.slice(1)),
        editor: upperMedian(editor.slice(1)),
        indexedDbRead: upperMedian(db.reads),
        indexedDbWrite: Math.round(db.writeMs * 10) / 10,
        image: imageMs === null ? null : Math.round(imageMs * 10) / 10,
      },
      decodedJavaScriptBytes: { dashboard: dashboardBytes, editor: editorBytes },
      javascriptHeapKiB: { dashboard: upperMedian(dashboardHeap), editor: upperMedian(editorHeap) },
    };
  } finally { await context.close(); }
}
async function run() {
  const browser=await chromium.launch({headless:true});
  try {
    const image = await readFile(new URL("../public/msu-university-seal.png", import.meta.url));
    const desktop=await bench(browser,{width:1440,height:900},image);
    const mobile=await bench(browser,{width:390,height:844},null);
    const route=[];
    for(let i=0;i<9;i++) {
      const start=performance.now();
      const response=await fetch(base+"/api/admin/session");
      expect(response.status).toBe(200);
      await response.json();
      route.push(performance.now() - start);
    }
    const output={desktop,mobile,loopbackAdminSessionMs:upperMedian(route.slice(1)),notes:"Chrome local production build; 101 local seeded plans; warm upper medians exclude first Playwright iteration; real-time automation can add wait granularity; representative fixture image only; heap is V8 JS only, not process RSS; no provider timings."};
    console.log(JSON.stringify(output, null, 2));
  } finally { await browser.close(); }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
