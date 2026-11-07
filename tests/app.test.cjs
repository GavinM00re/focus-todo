const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
// Exercise the actual pure validation and persistence functions without a browser.
const validation = source.slice(source.indexOf('  function validate('), source.indexOf('  function notify('));
const saving = source.slice(source.indexOf('  function parseState('), source.indexOf('  function node('));
const date = source.split('\n').find(line => line.includes('const dateValid ='));
const publishedSource = fs.readFileSync(require('node:path').join(__dirname,'../published-tasks.js'),'utf8');
function harness({fail=false,damaged=false,raw=null,seeds=[]}={}) {
 const disk = {raw, fail};
 const context = vm.createContext({damagedStorage:damaged,tasks:[],appliedSeedIds:[],storageSnapshot:null,focusPublishedTasks:seeds,KEY:'test',localStorage:{getItem(){return disk.raw;},setItem(k,v){if(disk.fail)throw Error('blocked');disk.raw=v;context.saved=v;}},render(){},notify(message){context.message=message;}});
 vm.runInContext(`${date}\n${validation}\n${saving}`,context);context.disk=disk;return context;
}
const item = (extra={}) => ({id:'a',title:' Example ',notes:'notes',priority:'medium',due:'2026-11-07',done:false,created:1,tags:[],...extra});
test('valid backup is normalized and unknown fields removed',()=>{const h=harness();const result=h.validate([item({extra:'ignored'})]);assert.equal(result[0].title,'Example');assert.equal(result[0].extra,undefined);});
test('invalid dates safely reject, leap days validate',()=>{const h=harness();for(const due of ['2026-99-99','2026-02-30','2025-02-29','0000-01-01','nonsense'])assert.throws(()=>h.validate([item({due})]),/invalid tasks/);assert.equal(h.validate([item({due:'2024-02-29'})]).length,1);assert.equal(h.validate([item({due:''})]).length,1);});
test('malformed shapes, duplicates and oversized backups reject',()=>{const h=harness();for(const data of [null,{},[item(),item()],[item({title:' '})],[item({done:'yes'})],[item({priority:'urgent'})],[item({notes:'x'.repeat(2001)})]])assert.throws(()=>h.validate(data));assert.throws(()=>h.validate(Array(10001).fill(item())),/10,000/);});
test('successful save serializes data and can be reloaded',()=>{const h=harness();assert.equal(h.save([item()]),true);const reloaded=h.parseState(h.saved).tasks;assert.equal(reloaded.length,1);assert.equal(reloaded[0].id,'a');assert.equal(h.tasks.length,1);});
test('failed storage does not mutate the in-memory list',()=>{const h=harness({fail:true});assert.equal(h.save([item()]),false);assert.equal(h.tasks.length,0);assert.match(h.message,/Could not save/);});
test('unreadable storage is protected against writes',()=>{const h=harness({damaged:true});assert.equal(h.save([item()]),false);assert.equal(h.saved,undefined);assert.match(h.message,/disabled/);});
test('merged list limit is enforced before saving',()=>{const h=harness();assert.equal(h.save(Array(10001).fill(item())),false);assert.equal(h.saved,undefined);assert.match(h.message,/10,000/);});

const plain = value => JSON.parse(JSON.stringify(value));
test('published dataset contains exactly the authorized 13 distinct tasks',()=>{
 const h=harness();vm.runInContext(publishedSource,h);const entries=h.validate(h.focusPublishedTasks);
 assert.equal(entries.length,13);assert.equal(entries.filter(t=>t.done).length,1);
 assert.equal(entries[0].title,'Cal Placenta');assert.match(entries[0].notes,/Sample date: 261102 \(2026-11-02\)/);assert.equal(entries[0].notes,'Sample date: 261102 (2026-11-02). Tissue clearing with CUBIC-R. Completed.');assert.match(entries[0].notes,/CUBIC-R/);
 assert.ok(entries.every(t=>t.due===''&&t.priority==='medium'));
 assert.equal(entries.filter(t=>t.title.includes('with DANS')).length,6);
 assert.equal(entries.filter(t=>t.title.includes('control on an Anodisc')).length,6);
 assert.ok(entries.slice(7).every(t=>!t.notes.includes('Fenton')));
});
test('legacy arrays migrate atomically, preserve all tasks, and add missing seeds',()=>{
 const old=item({title:'Custom title',notes:'My edits',done:true});const seed=item({id:'seed'});
 const h=harness({raw:JSON.stringify([old]),seeds:[seed]});assert.equal(h.loadTasks(),true);
 const state=JSON.parse(h.disk.raw);assert.deepEqual(state.tasks,[old,{...seed,title:'Example'}]);assert.deepEqual(state.appliedSeedIds,['seed']);
 assert.equal(state.version,1);
});
test('an existing seeded ID preserves local edits and gets a receipt',()=>{
 const edited=item({id:'seed',title:'My edited seed',notes:'Edited',done:true,due:'2027-01-01',priority:'low'});
 const h=harness({raw:JSON.stringify([edited]),seeds:[item({id:'seed'})]});h.loadTasks();
 assert.deepEqual(plain(h.tasks),[edited]);assert.deepEqual(plain(h.appliedSeedIds),['seed']);
});
test('repeated loads do not duplicate seeds; deletion and clearing survive reload',()=>{
 const seeds=[item({id:'seed'}),item({id:'complete',done:true})];const h=harness({seeds});
 h.loadTasks();h.loadTasks();assert.equal(h.tasks.length,2);
 assert.equal(h.save(h.tasks.filter(t=>!t.done)),true);h.loadTasks();assert.equal(h.tasks.length,1);
 assert.equal(h.save([]),true);h.loadTasks();assert.equal(h.tasks.length,0);
 const freshTab=harness({raw:h.disk.raw,seeds});freshTab.loadTasks();assert.equal(freshTab.tasks.length,0);
});
test('future new seeds merge without restoring deleted or overwriting edited seeds',()=>{
 const h=harness({seeds:[item({id:'seed'})]});h.loadTasks();h.save([]);
 h.focusPublishedTasks=[item({id:'seed'}),item({id:'future',title:'Future task'})];h.loadTasks();
 assert.deepEqual(plain(h.tasks.map(t=>t.id)),['future']);assert.deepEqual(plain(h.appliedSeedIds),['seed','future']);
});
test('failed migration keeps the exact original disk and in-memory tasks; retry works',()=>{
 const old=item({title:'Keep this'}),raw=JSON.stringify([old]);const h=harness({raw,fail:true,seeds:[item({id:'seed'})]});
 h.loadTasks();assert.equal(h.disk.raw,raw);assert.deepEqual(plain(h.tasks),[old]);assert.deepEqual(plain(h.appliedSeedIds),[]);
 h.disk.fail=false;h.loadTasks();assert.equal(h.tasks.length,2);assert.deepEqual(plain(h.appliedSeedIds),['seed']);
});
test('failed writes after seeding retain task data and receipts',()=>{
 const h=harness({seeds:[item({id:'seed'})]});h.loadTasks();const raw=h.disk.raw;
 h.disk.fail=true;assert.equal(h.save([]),false);assert.equal(h.disk.raw,raw);assert.equal(h.tasks.length,1);assert.deepEqual(plain(h.appliedSeedIds),['seed']);
});
test('corrupt arrays, envelopes and JSON are never overwritten by load or save',()=>{
 for(const raw of ['', '{broken', '{}', JSON.stringify([item({title:''})]), JSON.stringify({version:99,tasks:[]}), JSON.stringify({version:1,tasks:[],appliedSeedIds:[null]})]) {
  const h=harness({raw,seeds:[item({id:'seed'})]});assert.equal(h.loadTasks(),false);assert.equal(h.save([]),false);assert.equal(h.disk.raw,raw);
 }
});
test('version 1 backups are accepted without changing the JSON import/export task shape',()=>{
 const h=harness({raw:JSON.stringify({version:1,exportedAt:'2026-11-07',tasks:[item({title:'Backup'})]}),seeds:[item({id:'seed'})]});h.loadTasks();assert.equal(h.tasks.length,2);
 const backup=JSON.stringify({version:1,exportedAt:'2026-11-07',tasks:h.tasks});assert.deepEqual(plain(h.validate(JSON.parse(backup).tasks)),plain(h.tasks));
});
test('another tab edits or deletes seeds: refresh honors receipts and stale saves are rejected',()=>{
 const h=harness({seeds:[item({id:'seed'})]});h.loadTasks();const stale=[...h.tasks,item({id:'new'})];
 h.disk.raw=JSON.stringify({version:1,tasks:[],appliedSeedIds:['seed']});
 assert.equal(h.save(stale),false);assert.equal(h.tasks.length,0);assert.equal(JSON.parse(h.disk.raw).tasks.length,0);
 h.loadTasks();assert.equal(h.tasks.length,0);
});
test('corrupt cross-tab updates leave last good tasks visible but block further writes',()=>{
 const h=harness({seeds:[item({id:'seed'})]});h.loadTasks();h.disk.raw='{broken';h.loadTasks();
 assert.equal(h.tasks.length,1);assert.equal(h.save([]),false);assert.equal(h.disk.raw,'{broken');
});
test('full legacy lists are preserved and future seeds wait until there is room',()=>{
 const tasks=Array.from({length:10000},(_,i)=>item({id:String(i)}));
 const h=harness({raw:JSON.stringify(tasks),seeds:[item({id:'seed'})]});h.loadTasks();assert.equal(h.tasks.length,10000);assert.equal(h.appliedSeedIds.length,0);
 h.save(h.tasks.slice(1));h.loadTasks();assert.equal(h.tasks.length,10000);assert.equal(h.tasks.at(-1).id,'seed');
});

test('tags normalize and old backups safely default to empty tags',()=>{
 const h=harness(); const old=item(); delete old.tags;
 assert.deepEqual(plain(h.validate([old])[0].tags),[]);
 assert.deepEqual(plain(h.validate([item({tags:[' lab ','lab','','follow-up']})])[0].tags),['lab','follow-up']);
 for(const tags of [null,'lab',[1],{}])assert.throws(()=>h.validate([item({tags})]),/invalid tags/);
});
test('tags survive edits, storage reload and backup round-trip without changing notes or completion',()=>{
 const h=harness({seeds:[item({id:'seed'})]}); h.loadTasks();
 const task={...h.tasks[0],tags:['lab','follow-up'],notes:'  exact notes  ',done:true};
 assert.equal(h.save([task]),true);h.loadTasks();
 const backup=JSON.stringify({version:1,tasks:h.tasks});
 assert.deepEqual(plain(h.validate(JSON.parse(backup).tasks)),[plain(task)]);
 assert.deepEqual(plain(h.appliedSeedIds),['seed']);
});
test('legacy tasks without tags keep edits and migrate beside all 13 starter entries',()=>{
 const old=item({id:'legacy',title:'Existing local task',done:true});delete old.tags;
 const seeds=vm.runInNewContext(publishedSource+';globalThis.focusPublishedTasks');
 const h=harness({raw:JSON.stringify([old]),seeds});h.loadTasks();
 assert.equal(h.tasks.length,14);assert.deepEqual(plain(h.tasks[0]),{...old,tags:[]});
 assert.equal(h.tasks.filter(t=>!t.done).length,12);assert.equal(h.tasks.filter(t=>t.done).length,2);
});
