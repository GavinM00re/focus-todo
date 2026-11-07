const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
// Exercise the actual pure validation and persistence functions without a browser.
const validation = source.slice(source.indexOf('  function validate('), source.indexOf('  function notify('));
const saving = source.slice(source.indexOf('  function save('), source.indexOf('  function node('));
const date = source.split('\n').find(line => line.includes('const dateValid ='));
function harness({fail=false,damaged=false}={}) {
 const context = vm.createContext({damagedStorage:damaged,tasks:[],KEY:'test',localStorage:{setItem(k,v){if(fail)throw Error('blocked');context.saved=v;}},render(){},notify(message){context.message=message;}});
 vm.runInContext(`${date}\n${validation}\n${saving}`,context);return context;
}
const item = (extra={}) => ({id:'a',title:' Example ',notes:'notes',priority:'medium',due:'2026-11-07',done:false,created:1,...extra});
test('valid backup is normalized and unknown fields removed',()=>{const h=harness();const result=h.validate([item({extra:'ignored'})]);assert.equal(result[0].title,'Example');assert.equal(result[0].extra,undefined);});
test('invalid dates safely reject, leap days validate',()=>{const h=harness();for(const due of ['2026-99-99','2026-02-30','2025-02-29','0000-01-01','nonsense'])assert.throws(()=>h.validate([item({due})]),/invalid tasks/);assert.equal(h.validate([item({due:'2024-02-29'})]).length,1);assert.equal(h.validate([item({due:''})]).length,1);});
test('malformed shapes, duplicates and oversized backups reject',()=>{const h=harness();for(const data of [null,{},[item(),item()],[item({title:' '})],[item({done:'yes'})],[item({priority:'urgent'})],[item({notes:'x'.repeat(2001)})]])assert.throws(()=>h.validate(data));assert.throws(()=>h.validate(Array(10001).fill(item())),/10,000/);});
test('successful save serializes data and can be reloaded',()=>{const h=harness();assert.equal(h.save([item()]),true);const reloaded=h.validate(JSON.parse(h.saved));assert.equal(reloaded.length,1);assert.equal(reloaded[0].id,'a');assert.equal(h.tasks.length,1);});
test('failed storage does not mutate the in-memory list',()=>{const h=harness({fail:true});assert.equal(h.save([item()]),false);assert.equal(h.tasks.length,0);assert.match(h.message,/Could not save/);});
test('unreadable storage is protected against writes',()=>{const h=harness({damaged:true});assert.equal(h.save([item()]),false);assert.equal(h.saved,undefined);assert.match(h.message,/disabled/);});
test('merged list limit is enforced before saving',()=>{const h=harness();assert.equal(h.save(Array(10001).fill(item())),false);assert.equal(h.saved,undefined);assert.match(h.message,/10,000/);});
