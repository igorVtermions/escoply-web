import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const nodeRequire=createRequire(import.meta.url);

// Compile actual modules in memory, substituting only external services. No credentials/network.
function loader(overrides={}) {
  const cache=new Map();
  function load(file){
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
    const loaded={exports:{}};cache.set(file,loaded);
    const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const localRequire=name=>{
      if(name in overrides)return overrides[name];
      if(name==='server-only')return {};
      if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name+'.ts'));
      return nodeRequire(name);
    };
    vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:file})(localRequire,loaded,loaded.exports);
    return loaded.exports;
  }
  return load;
}
const model=loader()('lib/google/model.ts');
const base={title:'Reunião',description:'Briefing',start:'2026-09-25T12:00:00.000Z',end:'2026-09-25T13:00:00.000Z',allDay:false,completed:false,reminders:{useDefault:false,overrides:[{method:'popup',minutes:15}]}};
test('three-way comparison preserves independent edits and detects conflicts',()=>{
  const local={...base,title:'Alterado no app'};const remote={...base,title:'Alterado no Google'};
  assert.equal(model.decideSync(base,base,base),'equal');
  assert.equal(model.decideSync(local,base,base),'push');
  assert.equal(model.decideSync(base,remote,base),'pull');
  assert.equal(model.decideSync(local,remote,base),'conflict');
  assert.equal(model.decideSync(local,local,base),'equal');
  assert.equal(model.decideSync(null,base,base),'deletion');
  assert.equal(model.decideSync(base,null,base),'deletion');
  assert.equal(model.decideSync(null,null,base),'gone');
});
test('São Paulo date crosses UTC midnight correctly and rejects impossible dates',()=>{
  assert.equal(model.saoDate('2026-09-26T01:00:00Z'),'2026-09-25');
  assert.equal(model.saoTime('2026-09-26T01:00:00Z'),'22:00');
  assert.equal(model.validDate('2026-02-30'),false);assert.equal(model.validDate('2028-02-29'),true);
});
test('reminder order does not create false conflicts',()=>{
  const reminders=[{method:'email',minutes:60},{method:'popup',minutes:15}];
  assert.equal(model.canonical({...base,reminders:{useDefault:false,overrides:reminders}}),model.canonical({...base,reminders:{useDefault:false,overrides:[...reminders].reverse()}}));
});
test('task completion, undated tasks and local time semantics',()=>{
  const row={title:'Tarefa',google_notes:'Notas',google_undated:false,scheduled_at:'2026-09-26T01:00:00Z',completed_at:null};
  assert.equal(model.taskValue(row).start,'2026-09-25');
  assert.equal(model.taskValue({...row,google_undated:true}).start,'');
  assert.equal(model.taskValue({...row,completed_at:'2026-09-25T12:00:00Z'}).completed,true);
});
test('Google mapping round-trips alarms and exclusive all-day end',()=>{
  const provider=loader({'./server':{}})('lib/google/provider.ts');
  const value={...base,start:'2026-09-25',end:'2026-09-27',allDay:true};
  const payload=provider.payload('event',value,'link');
  assert.equal(payload.end.date,'2026-09-27');
  assert.equal(model.canonical(provider.remoteValue('event',{id:'a',...payload})),model.canonical(value));
  assert.ok(provider.unsupported('event',{recurrence:['RRULE:FREQ=WEEKLY']}));
  assert.ok(provider.unsupported('task',{parent:'parent-id'}));
  assert.equal(provider.remoteValue('event',{status:'cancelled'}),null);
});
test('task marker survives insertion but stays out of user notes',()=>{
  const provider=loader({'./server':{}})('lib/google/provider.ts');const id=crypto.randomUUID();
  const value={...base,start:'2026-09-25',end:'',allDay:true,reminders:{useDefault:false,overrides:[]}};
  const body=provider.payload('task',value,id);
  assert.ok(body.notes.includes('[escoply:'+id+']'));
  assert.equal(model.canonical(provider.remoteValue('task',{id:'a',...body})),model.canonical(value));
});
test('pagination completes all pages; failure never masquerades as an empty collection',async()=>{
  let calls=0;
  const provider=loader({'./server':{googleFetch:async()=>++calls===1?{items:[{id:'1'}],nextPageToken:'next'}:{items:[{id:'2'}]}}})('lib/google/provider.ts');
  assert.equal((await provider.listAll('token','/tasks/test',()=>{})).length,2);
  const failing=loader({'./server':{googleFetch:async()=>{throw new Error('network');}}})('lib/google/provider.ts');
  await assert.rejects(()=>failing.listAll('token','/tasks/test',()=>{}),/network/);
});

function database(initial){
  const tables=structuredClone(initial);
  class Query{
    constructor(name){this.name=name;this.filters=[];this.operation='read';this.one=false;}
    select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}
    in(k,values){this.filters.push(r=>values.includes(r[k]));return this;}
    lt(k,v){this.filters.push(r=>r[k]<v);return this;}lte(k,v){this.filters.push(r=>r[k]<=v);return this;}limit(n){this.slice=[0,n];return this;}
    order(k){this.sort=k;return this;}range(a,b){this.slice=[a,b+1];return this;}
    maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}
    update(v){this.operation='update';this.values=v;return this;}insert(v){this.operation='insert';this.values=v;return this;}delete(){this.operation='delete';return this;}
    then(resolve,reject){try{
      const rows=tables[this.name]??(tables[this.name]=[]);let matched=rows.filter(r=>this.filters.every(f=>f(r)));
      if(this.operation==='insert'){
        const defaults=this.name==='google_sync_links'?{id:crypto.randomUUID(),remote_id:null,baseline:null,remote_snapshot:null,issue:null,resolution:null,insertion_pending:false}:{};
        const value={...defaults,...this.values,updated_at:new Date().toISOString()};rows.push(value);matched=[value];
      }
      if(this.operation==='update')matched.forEach(r=>Object.assign(r,this.values));
      if(this.operation==='delete')tables[this.name]=rows.filter(r=>!matched.includes(r));
      if(this.sort)matched.sort((a,b)=>String(a[this.sort]).localeCompare(String(b[this.sort])));
      if(this.slice)matched=matched.slice(...this.slice);
      return Promise.resolve({data:structuredClone(this.one?matched[0]??null:matched),error:null}).then(resolve,reject);
    }catch(e){return Promise.reject(e).then(resolve,reject);}}
  }
  return {tables,from:n=>new Query(n),rpc:async()=>({data:true,error:null})};
}
function syncHarness({events=[],tasks=[],links=[],remoteEvents=[],remoteTasks=[],failInsert=false}={}){
  const owner='owner';const db=database({google_connections:[{owner_id:owner,status:'connected',calendar_id:'cal',tasklist_id:'list',auto_business:[],auto_reminder_minutes:null}],google_sync_links:links,calendar_events:events,reminders:tasks});
  const remote={event:structuredClone(remoteEvents),task:structuredClone(remoteTasks)};let insertions=0;
  class ApiError extends Error{}
  const server={googleContext:async()=>({owner,db}),checked:r=>{if(r.error)throw r.error;return r.data;},accessToken:async()=>'test-token',GoogleApiError:ApiError,googleFetch:async(token,url,method='GET',body)=>{
    const kind=url.startsWith('/tasks/')?'task':'event';const rows=remote[kind];
    if(method==='GET')return {items:structuredClone(rows)};
    if(method==='POST'){insertions++;const row={...body,id:body.id??crypto.randomUUID(),etag:'v1'};rows.push(row);if(failInsert)throw new Error('Resposta interrompida');return structuredClone(row);}
    const id=decodeURIComponent(url.split('/').at(-1));const row=rows.find(r=>r.id===id);
    if(method==='PATCH'){Object.assign(row,body);return structuredClone(row);}
    if(method==='DELETE'){row.deleted=true;row.status='cancelled';return;}
  }};
  const sync=loader({'./server':server})('lib/google/sync.ts');
  const business=loader({'./server':server})('lib/google/business.ts');
  const automatic=loader({'./server':server})('lib/google/automatic.ts');
  return {db,remote,sync,business,automatic,server,insertions:()=>insertions};
}
const localEvent={id:'event-local',owner_id:'owner',title:base.title,description:base.description,starts_at:base.start,ends_at:base.end,all_day:false,start_date:null,end_date:null,reminders:base.reminders,updated_at:'v1'};

test('three tasks in separate days retain distinct Google dates around midnight and year end',()=>{
  const provider=loader({'./server':{}})('lib/google/provider.ts');
  const dates=['2026-09-13T12:00:00-03:00','2026-09-29T01:00:00Z','2027-01-01T01:00:00Z'];
  assert.deepEqual(dates.map(scheduled_at=>provider.payload('task',model.taskValue({title:'Teste',google_notes:'',google_undated:false,scheduled_at,completed_at:null}),'id').due),['2026-09-13T00:00:00.000Z','2026-09-28T00:00:00.000Z','2026-12-31T00:00:00.000Z']);
});
test('selection separates old, completed and undated new items',()=>{
  const selection=loader()('lib/google/selection.ts');const options={tasks:true,events:true,from:'2026-09-25',includeCompleted:false,includeUndated:false};
  assert.ok(selection.selectionReason({...base,start:'2026-09-13'},options));
  assert.ok(selection.selectionReason({...base,start:''},options));
  assert.ok(selection.selectionReason({...base,completed:true},options));
  assert.equal(selection.selectionReason({...base,start:'2026-09-28'},options),null);
  assert.throws(()=>selection.validateSelection({...options,from:'2026-02-30'}));
});
test('old unsynced items are excluded but existing old links still receive edits',async()=>{
  const h=syncHarness({events:[localEvent]});const options={tasks:true,events:true,from:'2026-10-01',includeCompleted:false,includeUndated:false};
  await h.sync.syncGoogle(options);assert.equal(h.insertions(),0);
  await h.sync.syncGoogle({...options,from:''});assert.equal(h.insertions(),1);
  h.remote.event[0].summary='Editar antigo';await h.sync.syncGoogle(options);
  assert.equal(h.db.tables.calendar_events[0].title,'Editar antigo');
});
test('disabled category is preserved without importing or exporting records',async()=>{
  const h=syncHarness({events:[localEvent],remoteEvents:[{id:'g',summary:'Remoto',start:{dateTime:base.start},end:{dateTime:base.end}}]});
  await h.sync.syncGoogle({events:false,tasks:true,from:'',includeCompleted:true,includeUndated:true});
  assert.equal(h.db.tables.calendar_events.length,1);assert.equal(h.insertions(),0);
});
test('projection metadata prevents personal event import',async()=>{
  const h=syncHarness({remoteEvents:[{id:'project',summary:'Prazo',start:{date:'2026-09-13'},end:{date:'2026-09-14'},extendedProperties:{private:{escoplyProjection:'link'}}}]});
  await h.sync.syncGoogle();assert.equal(h.db.tables.calendar_events.length,0);
});
const businessSelection={kinds:['project'],from:'',minutes:null};
const projectRow={id:'project',owner_id:'owner',name:'Projeto',deadline:'2026-09-13',status:'in_progress'};
const queueRow={owner_id:'owner',kind:'event',local_id:'event-local',version:'v1',attempts:0,retry_at:'2020-01-01',queued_at:'2020-01-01'};
test('automatic queue sends only changed item, not historical or unrelated Google records',async()=>{
  const h=syncHarness({events:[localEvent,{...localEvent,id:'old-history'}],remoteEvents:[{id:'foreign',summary:'Unrelated',start:{dateTime:base.start},end:{dateTime:base.end}}]});
  h.db.tables.google_outbox=[{...queueRow}];await h.automatic.flushGoogleQueue();
  assert.equal(h.insertions(),1);assert.equal(h.db.tables.calendar_events.length,2);assert.equal(h.db.tables.google_outbox.length,0);
});
test('automatic queue retains failed attempts with backoff and does not erase a local save',async()=>{
  const h=syncHarness({events:[localEvent]});h.db.tables.google_outbox=[{...queueRow}];
  h.server.accessToken=async()=>{throw Error('temporary outage')};await h.automatic.flushGoogleQueue();
  assert.equal(h.db.tables.google_outbox[0].attempts,1);assert.ok(Date.parse(h.db.tables.google_outbox[0].retry_at)>Date.now());assert.equal(h.db.tables.calendar_events.length,1);
});
test('per-item provider failure keeps the automatic job for recovery',async()=>{
  const h=syncHarness({events:[localEvent],failInsert:true});h.db.tables.google_outbox=[{...queueRow}];
  await h.automatic.flushGoogleQueue();assert.equal(h.db.tables.google_outbox.length,1);assert.equal(h.db.tables.google_outbox[0].attempts,1);
  h.db.tables.google_outbox[0].retry_at='2020-01-01';await h.automatic.flushGoogleQueue();assert.equal(h.insertions(),1);assert.equal(h.db.tables.google_outbox.length,0);
});
test('a new queued version during sending is not acknowledged by the older job',async()=>{
  const h=syncHarness({events:[localEvent]});h.db.tables.google_outbox=[{...queueRow}];
  const fetch=h.server.googleFetch;h.server.googleFetch=async(...args)=>{const result=await fetch(...args);if(args[2]==='POST')h.db.tables.google_outbox[0].version='v2';return result};
  await h.automatic.flushGoogleQueue();assert.equal(h.db.tables.google_outbox[0].version,'v2');
});
test('disconnected account does not send queued items',async()=>{
  const h=syncHarness({events:[localEvent]});h.db.tables.google_outbox=[{...queueRow}];h.db.tables.google_connections[0].status='disconnected';
  assert.equal((await h.automatic.flushGoogleQueue()).enabled,false);assert.equal(h.insertions(),0);assert.equal(h.db.tables.google_outbox.length,1);
});
test('business projection keeps project deadline and exclusive next-day end, without duplicate on retry',async()=>{
  const h=syncHarness();h.db.tables.projects=[{...projectRow}];
  await h.business.syncBusiness(businessSelection);await h.business.syncBusiness(businessSelection);
  assert.equal(h.insertions(),1);assert.equal(h.remote.event[0].start.date,'2026-09-13');assert.equal(h.remote.event[0].end.date,'2026-09-14');
  assert.equal(h.db.tables.projects[0].deadline,'2026-09-13');
  await h.sync.syncGoogle();assert.equal(h.db.tables.calendar_events.length,0);
});
test('new project deadline updates same Google event; paid source removes only projection',async()=>{
  const h=syncHarness();h.db.tables.projects=[{...projectRow}];await h.business.syncBusiness(businessSelection);
  h.db.tables.projects[0].deadline='2026-09-28';await h.business.syncBusiness(businessSelection);
  assert.equal(h.insertions(),1);assert.equal(h.remote.event[0].start.date,'2026-09-28');
  h.db.tables.projects[0].status='completed';await h.business.syncBusiness(businessSelection);
  assert.equal(h.remote.event[0].status,'cancelled');assert.equal(h.db.tables.projects.length,1);
});
test('Google edit is a conflict, never a mutation of the business source',async()=>{
  const h=syncHarness();h.db.tables.projects=[{...projectRow}];await h.business.syncBusiness(businessSelection);
  h.remote.event[0].start.date='2026-09-20';await h.business.syncBusiness(businessSelection);
  assert.ok(h.db.tables.google_business_links[0].issue);assert.equal(h.db.tables.projects[0].deadline,'2026-09-13');assert.equal(h.remote.event[0].start.date,'2026-09-20');
});
test('business conflict choice is invalidated by a later source edit',async()=>{
  const h=syncHarness();h.db.tables.projects=[{...projectRow}];await h.business.syncBusiness(businessSelection);
  h.remote.event[0].summary='Mudou';await h.business.syncBusiness(businessSelection);
  const link=h.db.tables.google_business_links[0];await h.business.resolveBusinessIssue(link.id,true,businessSelection);
  h.db.tables.projects[0].deadline='2026-10-01';await h.business.syncBusiness(businessSelection);
  assert.equal(h.remote.event[0].summary,'Mudou');assert.equal(link.resolution,false);
});
test('lost projection creation response recovers by persisted deterministic ID',async()=>{
  const h=syncHarness({failInsert:true});h.db.tables.projects=[{...projectRow}];await h.business.syncBusiness(businessSelection);await h.business.syncBusiness(businessSelection);
  assert.equal(h.insertions(),1);assert.equal(h.db.tables.google_business_links[0].issue,null);
});
test('projection pagination above a change batch continues without duplicates',async()=>{
  const h=syncHarness();h.db.tables.projects=Array.from({length:30},(_,i)=>({...projectRow,id:'p'+i}));
  await assert.rejects(()=>h.business.syncBusiness(businessSelection),/parcialmente/);
  await h.business.syncBusiness(businessSelection);assert.equal(h.insertions(),30);
});
test('business dates handle leap day and do not invent dates for missing deadlines',()=>{
  const m=loader()('lib/google/business-model.ts');
  assert.equal(m.businessValue({id:'x',kind:'project',title:'Prazo',date:'2028-02-29',active:true},900).end,'2028-03-01');
  assert.equal(m.businessValue({date:'',active:true},null),null);
  assert.equal(m.businessValue({date:'2026-09-25',active:false},null),null);
});
test('manual sync creates once and subsequent sync is idempotent',async()=>{
  const h=syncHarness({events:[localEvent]});await h.sync.syncGoogle();await h.sync.syncGoogle();
  assert.equal(h.insertions(),1);assert.equal(h.db.tables.google_sync_links.length,1);
});
test('Google-origin events import once, then remote edits reach local storage',async()=>{
  const remote={id:'google-event',summary:'No Google',description:'',start:{dateTime:base.start},end:{dateTime:base.end},reminders:base.reminders};
  const h=syncHarness({remoteEvents:[remote]});await h.sync.syncGoogle();await h.sync.syncGoogle();assert.equal(h.db.tables.calendar_events.length,1);
  h.remote.event[0].summary='Reagendado';await h.sync.syncGoogle();assert.equal(h.db.tables.calendar_events[0].title,'Reagendado');
});
test('lost Tasks insertion response is recovered from its marker without duplicate',async()=>{
  const task={id:'local-task',owner_id:'owner',title:'Tarefa teste',google_notes:'',google_undated:false,scheduled_at:base.start,completed_at:null,task_status:'todo',updated_at:'v1'};
  const h=syncHarness({tasks:[task],failInsert:true});await h.sync.syncGoogle();await h.sync.syncGoogle();assert.equal(h.insertions(),1);assert.equal(h.db.tables.google_sync_links[0].issue,null);
});
test('remote deletion needs confirmation and can restore with a fresh event ID',async()=>{
  const h=syncHarness({events:[localEvent]});await h.sync.syncGoogle();const oldId=h.remote.event[0].id;h.remote.event[0].status='cancelled';
  await h.sync.syncGoogle();assert.equal(h.db.tables.calendar_events.length,1);assert.match(h.db.tables.google_sync_links[0].issue,/Exclusão/);
  await h.sync.resolveGoogleIssue(h.db.tables.google_sync_links[0].id,'local');await h.sync.syncGoogle();assert.notEqual(h.db.tables.google_sync_links[0].remote_id,oldId);
});
test('stale conflict choice cannot overwrite a subsequent local edit',async()=>{
  const h=syncHarness({events:[localEvent]});await h.sync.syncGoogle();h.db.tables.calendar_events[0].title='Local';h.remote.event[0].summary='Remoto';
  await h.sync.syncGoogle();await h.sync.resolveGoogleIssue(h.db.tables.google_sync_links[0].id,'remote');h.db.tables.calendar_events[0].title='Mais recente';
  await h.sync.syncGoogle();assert.equal(h.db.tables.calendar_events[0].title,'Mais recente');assert.match(h.db.tables.google_sync_links[0].issue,/mudou após/);
});

test('confirmed deletion removes the remaining copy only after explicit resolution',async()=>{
  const h=syncHarness({events:[localEvent]});await h.sync.syncGoogle();h.db.tables.calendar_events=[];
  await h.sync.syncGoogle();assert.notEqual(h.remote.event[0].status,'cancelled');
  await h.sync.resolveGoogleIssue(h.db.tables.google_sync_links[0].id,'delete');await h.sync.syncGoogle();
  assert.equal(h.remote.event[0].status,'cancelled');assert.equal(h.db.tables.google_sync_links.length,0);
});
test('25-operation batch resumes without losing or duplicating items',async()=>{
  const events=Array.from({length:30},(_,i)=>({...localEvent,id:crypto.randomUUID(),title:'Evento '+i}));
  const h=syncHarness({events});await assert.rejects(()=>h.sync.syncGoogle(),/parcialmente/);await h.sync.syncGoogle();
  assert.equal(h.remote.event.length,30);assert.equal(h.insertions(),30);
});
test('lease contention prevents external API calls',async()=>{
  const h=syncHarness({events:[localEvent]});h.db.rpc=async()=>({data:false,error:null});
  await assert.rejects(()=>h.sync.syncGoogle(),/andamento/);assert.equal(h.insertions(),0);
});
test('project daily ceiling prevents API work when exhausted',async()=>{
  const h=syncHarness({events:[localEvent]});h.db.rpc=async(name)=>({data:name==='acquire_google_lock',error:null});
  await assert.rejects(()=>h.sync.syncGoogle(),/Limite diário/);assert.equal(h.insertions(),0);
});
test('tokens are authenticated, encrypted and bound to their owner',()=>{
  const names=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','GOOGLE_TOKEN_ENCRYPTION_KEY'];
  const before=names.map(n=>process.env[n]);
  Object.assign(process.env,{GOOGLE_CLIENT_ID:'test',GOOGLE_CLIENT_SECRET:'test',GOOGLE_REDIRECT_URI:'http://localhost:3000/api/integrations/google/callback',GOOGLE_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32)});
  try{
    const server=loader({'@/lib/supabase/server':{},'@/lib/supabase/admin':{}})('lib/google/server.ts');
    const sealed=server.seal('test-refresh-token','owner-a');
    assert.ok(!sealed.includes('test-refresh-token'));assert.equal(server.unseal(sealed,'owner-a'),'test-refresh-token');
    assert.throws(()=>server.unseal(sealed,'owner-b'));
    const parts=sealed.split('.');const bytes=Buffer.from(parts[2],'base64url');bytes[0]^=1;parts[2]=bytes.toString('base64url');
    assert.throws(()=>server.unseal(parts.join('.'),'owner-a'));
  }finally{names.forEach((n,i)=>{if(before[i]===undefined)delete process.env[n];else process.env[n]=before[i];});}
});
test('unauthenticated and blocked users cannot obtain the privileged client',async()=>{
  let calls=0;
  const admin={createSupabaseAdminClient:()=>{calls++;return {};}};
  const unauth=loader({'@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})},'@/lib/supabase/admin':admin})('lib/google/server.ts');
  await assert.rejects(()=>unauth.googleContext(),/Entre/);
  const profileDb=database({profiles:[{id:'blocked-user',status:'blocked'}]});
  const blocked=loader({'@/lib/supabase/server':{createSupabaseServerClient:async()=>({...profileDb,auth:{getUser:async()=>({data:{user:{id:'blocked-user'}},error:null})}})},'@/lib/supabase/admin':admin})('lib/google/server.ts');
  await assert.rejects(()=>blocked.googleContext(),/ativa/);assert.equal(calls,0);
});
