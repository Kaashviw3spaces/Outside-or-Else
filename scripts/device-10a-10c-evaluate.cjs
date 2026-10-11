const fs=require('fs');
(async()=>{
  let socket,timer;const networkFailures=[];
  const option=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
  try{
    const targets=await(await fetch('http://127.0.0.1:'+(process.env.CDP_PORT||9229)+'/json',{signal:AbortSignal.timeout(10000)})).json();
    const target=targets.find(t=>t.type==='page'&&t.url.includes('localhost'));if(!target)throw Error('App WebView not found');
    socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r,j)=>{timer=setTimeout(()=>j(Error('Device CDP connection timeout')),10000);socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true})});clearTimeout(timer);
    socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Network.loadingFailed')networkFailures.push({error:m.params.errorText,blockedReason:m.params.blockedReason,corsError:m.params.corsErrorStatus?.corsError});if(m.method==='Runtime.consoleAPICalled'&&m.params.args.some(a=>a.value==='QA_NATIVE_GENERATE_STARTED')&&option('--native-start-file'))fs.writeFileSync(option('--native-start-file'),'native generate requested')});
    const command=(id,method,params={})=>new Promise((r,j)=>{timer=setTimeout(()=>j(Error(method+' timeout')),300000);const listener=e=>{const m=JSON.parse(e.data);if(m.id===id){socket.removeEventListener('message',listener);clearTimeout(timer);m.error?j(Error(m.error.message)):r(m.result)}};socket.addEventListener('message',listener);socket.send(JSON.stringify({id,method,params}))});
    if(process.argv.includes('--network'))await command(2,'Network.enable');
    if(option('--native-start-file'))await command(3,'Runtime.enable');
    const pending=command(1,'Runtime.evaluate',{expression:fs.readFileSync('artifacts/checkpoint-10a-10c/device-expression.js','utf8'),awaitPromise:true,returnByValue:true});
    if(option('--ready-file'))fs.writeFileSync(option('--ready-file'),'ready');
    const result=await pending;if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    console.log(JSON.stringify(process.argv.includes('--network')?{value:result.result.value,networkFailures}:result.result.value));
  }finally{clearTimeout(timer);socket?.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
