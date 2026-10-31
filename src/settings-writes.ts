export function createSettingsWriter<T extends object>(send:(scope:string,patch:Partial<T>|null,reset:boolean)=>Promise<void>,delay=300) {
 type Batch={patch:Partial<T>;reset:boolean;clear:boolean;ok:(()=>void)[];fail:((e:unknown)=>void)[]};
 const pending=new Map<string,Batch>();let timer:ReturnType<typeof setTimeout>|undefined;let running=false;
 async function flush(){
  timer=undefined;if(running)return;
  const entry=pending.entries().next();if(entry.done)return;
  const [scope,batch]=entry.value;pending.delete(scope);running=true;
  try{await send(scope,batch.clear?null:batch.patch,batch.reset);batch.ok.forEach(f=>f());}
  catch(e){batch.fail.forEach(f=>f(e));}
  finally{running=false;if(pending.size)timer=setTimeout(()=>void flush(),delay);}
 }
 return (scope:string,patch:Partial<T>|null)=>new Promise<void>((resolve,reject)=>{
  const batch:Batch=pending.get(scope)??{patch:{},reset:false,clear:false,ok:[],fail:[]};
  if(patch===null){batch.patch={};batch.reset=true;batch.clear=true;}
  else{Object.assign(batch.patch,patch);batch.clear=false;}
  batch.ok.push(resolve);batch.fail.push(reject);pending.set(scope,batch);
  if(!running){clearTimeout(timer);timer=setTimeout(()=>void flush(),delay);}
 });
}

