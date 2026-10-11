// Research only: Hub metadata/configs and blank-page WebGPU adapters. Never fetch weights.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const http = require('node:http')
const { spawn } = require('node:child_process')
const delay = ms => new Promise(r => setTimeout(r, ms))
const repos = ['onnx-community/Qwen3-1.7B-ONNX','onnx-community/Qwen2.5-1.5B-Instruct','HuggingFaceTB/SmolLM2-1.7B-Instruct']
async function metadata() {
 const results = await Promise.all(repos.map(async repo => {
  const url = `https://huggingface.co/api/models/${repo}?blobs=true`
  const res = await fetch(url); if (!res.ok) throw Error(`${url}: ${res.status}`)
  const m = await res.json()
  const configUrl = `https://huggingface.co/${repo}/resolve/${m.sha}/config.json`
  const c = await fetch(configUrl); if (!c.ok) throw Error(`${configUrl}: ${c.status}`)
  const config = await c.json()
  const t = await fetch(`https://huggingface.co/${repo}/resolve/${m.sha}/tokenizer_config.json`)
  if (!t.ok) throw Error(`tokenizer config: ${t.status}`)
  const tc = await t.json()
  const sourceRepo = repo === repos[0] ? 'Qwen/Qwen3-1.7B' : repo === repos[1] ? 'Qwen/Qwen2.5-1.5B-Instruct' : repo
  const sourceUrl = `https://huggingface.co/api/models/${sourceRepo}`
  const s = await fetch(sourceUrl); if (!s.ok) throw Error(`source metadata: ${s.status}`)
  const source = await s.json()
  return {repo, revision:m.sha, metadataUrl:url, configUrl, conversionLicense:m.cardData?.license ?? null,
   sourceRepo, sourceRevision:source.sha, sourceUrl, license:source.cardData?.license ?? null,
   config, tokenizerClass:tc.tokenizer_class, hasChatTemplate:!!tc.chat_template,
   thinkingSwitch:typeof tc.chat_template === 'string' && tc.chat_template.includes('enable_thinking'),
   files:m.siblings.map(f=>({path:f.rfilename,bytes:f.size,lfsSha256:f.lfs?.sha256}))}
 }))
 const report = {timestamp:new Date().toISOString(),method:'Hub API blob sizes and small JSON configs only; no ONNX, data shards, safetensors or tokenizer weights fetched',models:results}
 fs.writeFileSync('docs/ai-9b2-model-metadata.json',JSON.stringify(report,null,2)+'\n')
 for (const m of results) console.log(JSON.stringify({repo:m.repo,revision:m.revision,license:m.license,config:m.config,files:m.files.filter(f=>/onnx|tokenizer|vocab|merges|config|LICENSE/.test(f.path))}))
}
async function connect(url) {
 const socket = new WebSocket(url); await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})})
 let id = 0; const pending = new Map()
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}})
 return {socket,call:(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout '+method))},20000);pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}))})}
}
async function gpu() {
 const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
 const profile = fs.mkdtempSync(path.join(os.tmpdir(),'outside-9b2-gpu-'))
 const server = http.createServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'none'; connect-src 'none'");res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>GPU diagnostics only</title>')})
 let browser, page, control
 try {
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  browser = spawn(chrome,['--headless','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
  const active = path.join(profile,'DevToolsActivePort')
  for(let i=0;!fs.existsSync(active)&&i<100;i++)await delay(100)
  const [port,browserPath] = fs.readFileSync(active,'utf8').trim().split('\n')
  control = await connect(`ws://127.0.0.1:${port}${browserPath.trim()}`)
  const system = await control.call('SystemInfo.getInfo')
  const version = await control.call('Browser.getVersion')
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  page = await connect(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
  await page.call('Page.enable')
  await page.call('Network.enable')
  await page.call('Network.setBlockedURLs',{urls:['https://*']})
  await page.call('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`})
  await delay(500)
  const result = await page.call('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{const out={secureContext:isSecureContext,userAgent:navigator.userAgent,adapters:[]};for(const preference of ['default','low-power','high-performance']){const a=await navigator.gpu?.requestAdapter(preference==='default'?{}:{powerPreference:preference});out.adapters.push(a?{preference,info:{vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description,isFallbackAdapter:a.info.isFallbackAdapter},fp16:a.features.has('shader-f16'),maxBufferSize:a.limits.maxBufferSize,maxStorageBufferBindingSize:a.limits.maxStorageBufferBindingSize}: {preference,unavailable:true})}return out})()`})
  if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails))
  const report={timestamp:new Date().toISOString(),scope:'Fresh isolated headless Chrome; blank localhost page; no inference runtime/model/worker/device allocations; HTTPS blocked; OS preferences unchanged',version,system:system.gpu,webgpu:result.result.value}
  fs.writeFileSync('docs/ai-9b2-gpu-diagnostics.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report,null,2))
 } finally {
  if(control){await control.call('Browser.close').catch(()=>{});control.socket.close()}
  page?.socket.close();browser?.kill();await delay(1200);server.close()
  const resolved=path.resolve(profile),root=path.resolve(os.tmpdir())+path.sep
  if(!resolved.startsWith(root)||!path.basename(resolved).startsWith('outside-9b2-gpu-'))throw Error('Unsafe cleanup target')
  fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300})
 }
}
;(async()=>{if(process.argv.includes('--metadata'))await metadata();else if(process.argv.includes('--gpu'))await gpu();else throw Error('Choose --metadata or --gpu; neither loads models')})().catch(e=>{console.error(e);process.exitCode=1})
