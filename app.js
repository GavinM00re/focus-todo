'use strict';
(() => {
  const KEY = 'focus.tasks.v1', THEME = 'focus.theme.v1';
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const dateValid = s => { if (s === '') return true; if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number(s.slice(0,4)) < 1) return false; const d = new Date(s+'T12:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s; };
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let damagedStorage = false, storageSnapshot = null, appliedSeedIds = [];
  let tasks = [], view = 'todo', editing = null, undoAction = null, toastTimer;
  function validate(data) {
    if (!Array.isArray(data) || data.length > 10000) throw new Error('Expected a task list with at most 10,000 tasks.');
    const ids = new Set();
    return data.map(t => {
      if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 200 || typeof t.notes !== 'string' || t.notes.length > 2000 || !['high','medium','low'].includes(t.priority) || typeof t.due !== 'string' || !dateValid(t.due) || typeof t.done !== 'boolean' || !Number.isFinite(t.created)) throw new Error('This file contains invalid tasks. Nothing was imported.');
      if (t.tags !== undefined && (!Array.isArray(t.tags) || t.tags.some(tag => typeof tag !== 'string'))) throw new Error('This file contains invalid tags. Nothing was imported.');
      ids.add(t.id);
      return {id:t.id,title:t.title.trim(),notes:t.notes,priority:t.priority,due:t.due,done:t.done,created:t.created,tags:normalizeTags(t.tags || [])};
    });
  }
  function normalizeTags(tags) { return [...new Set(tags.map(tag => tag.trim()).filter(Boolean))]; }
  function notify(message, undo = null) { clearTimeout(toastTimer); $('toast').querySelector('span').textContent = message; $('toast').hidden = false; undoAction = undo; $('undo').hidden = !undo; toastTimer = setTimeout(() => { $('toast').hidden = true; undoAction = null; }, undo ? 12000 : 6500); }
  // Keep tasks and seed receipts together: a failed write cannot apply only half.
  function parseState(raw) {
    if (raw === null) return {tasks: [], appliedSeedIds: []};
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return {tasks: validate(data), appliedSeedIds: []};
    if (!data || data.version !== 1 || !Array.isArray(data.tasks)) throw new Error('Unrecognized saved data.');
    const receipts = data.appliedSeedIds === undefined ? [] : data.appliedSeedIds;
    if (!Array.isArray(receipts) || receipts.some(id => typeof id !== 'string' || !id)) throw new Error('Invalid seed receipts.');
    return {tasks: validate(data.tasks), appliedSeedIds: [...new Set(receipts)]};
  }
  function mergeSeeds(state, seeds) {
    const receipts = new Set(state.appliedSeedIds), ids = new Set(state.tasks.map(t => t.id));
    const next = [...state.tasks];
    for (const seed of validate(seeds)) {
      if (receipts.has(seed.id)) continue;
      if (!ids.has(seed.id)) {
        // Defer only missing entries when full, without losing any existing task.
        if (next.length >= 10000) continue;
        next.push(seed); ids.add(seed.id);
      }
      receipts.add(seed.id);
    }
    return {tasks: next, appliedSeedIds: [...receipts]};
  }
  function serializeState(state) { return JSON.stringify({version: 1, tasks: state.tasks, appliedSeedIds: state.appliedSeedIds}); }
  function loadTasks() {
    let raw, state;
    try { raw = localStorage.getItem(KEY); state = parseState(raw); }
    catch { damagedStorage = true; notify('Saved data is unreadable. Changes are disabled; Export saves a raw recovery copy.'); return false; }
    damagedStorage = false; storageSnapshot = raw;
    tasks = state.tasks; appliedSeedIds = state.appliedSeedIds;
    try {
      const merged = mergeSeeds(state, globalThis.focusPublishedTasks || []);
      const serialized = serializeState(merged);
      if (serialized !== raw) localStorage.setItem(KEY, serialized);
      storageSnapshot = serialized; tasks = merged.tasks; appliedSeedIds = merged.appliedSeedIds;
    } catch { notify('Could not save published tasks. Your saved list is unchanged. Free browser storage and reload to try again.'); }
    return true;
  }
  function save(next) {
    if (damagedStorage) { notify('Changes are disabled to protect unreadable saved data. Export a recovery copy first.'); return false; }
    if (next.length > 10000) { notify('This list is limited to 10,000 tasks. Export and clear some tasks first.'); return false; }
    try {
      // A tab can receive a storage event late. Refuse a stale write rather than
      // overwrite another tab's changes; the user can retry on the refreshed list.
      if (localStorage.getItem(KEY) !== storageSnapshot) {
        loadTasks(); render(); notify('Saved tasks changed in another tab. Review the refreshed list and try again.'); return false;
      }
      const serialized = serializeState({tasks: next, appliedSeedIds});
      localStorage.setItem(KEY, serialized); storageSnapshot = serialized; tasks = next; render(); return true;
    }
    catch { notify('Could not save. Browser storage may be full or blocked. Export a backup first.'); return false; }
  }
  function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
  function render() {
    const current = today();
    const active = tasks.filter(t => !t.done), done = tasks.length - active.length;
    $('count-todo').textContent = active.length;
    $('count-completed').textContent = done;
    const query = $('search').value.trim().toLowerCase(), priority = $('priority-filter').value;
    const filtered = tasks.filter(t => (view==='completed' ? t.done : !t.done) && (priority==='all' || t.priority===priority) && `${t.title} ${t.notes} ${t.tags.join(' ')}`.toLowerCase().includes(query));
    const rank = {high:0,medium:1,low:2};
    filtered.sort((a,b) => Number(a.done)-Number(b.done) || ($('sort').value==='due' ? (a.due||'9999-99-99').localeCompare(b.due||'9999-99-99') : $('sort').value==='priority' ? rank[a.priority]-rank[b.priority] : 0) || b.created-a.created);
    $('list-title').firstChild.textContent = ({todo:'To Do',completed:'Completed'})[view]+' ';
    $('list-count').textContent = filtered.length;
    const list = $('task-list'); list.replaceChildren();
    for (const t of filtered) {
      const row = node('article','task'+(t.done?' done':''));
      const check = node('input','task-check'); check.type='checkbox'; check.checked=t.done; check.setAttribute('aria-label',`Mark ${t.title} ${t.done?'incomplete':'complete'}`);
      check.addEventListener('change',() => { const next = tasks.map(x=>x.id===t.id?{...x,done:check.checked}:x); if (save(next)) { const target = [...$('task-list').querySelectorAll('input')].find(x=>x.dataset.id===t.id); (target || $('new-task')).focus(); } else check.checked=t.done; }); check.dataset.id=t.id;
      const body=node('div','task-main'); body.append(node('h3','task-title',t.title));
      if(t.notes) body.append(node('p','task-notes',t.notes));
      const meta=node('div','task-meta'); meta.append(node('span','priority '+t.priority,t.priority+' priority'));
      if(t.due) { const date = new Date(t.due+'T12:00:00'); const label=t.due===current?'Today':date.toLocaleDateString(undefined,{month:'short',day:'numeric',...(date.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})}); meta.append(node('span',!t.done&&t.due<current?'overdue':'',`${!t.done&&t.due<current?'Overdue · ':''}${label}`)); }
      for (const tag of t.tags) meta.append(node('span','tag',tag));
      body.append(meta);
      const actions=node('div','task-actions'), edit=node('button','','Edit'), del=node('button','','Delete');
      edit.setAttribute('aria-label',`Edit ${t.title}`); del.setAttribute('aria-label',`Delete ${t.title}`);
      edit.addEventListener('click',()=>openDialog(t)); del.addEventListener('click',()=>{ const removed=t; if(save(tasks.filter(x=>x.id!==t.id))) { notify('Task deleted.',()=>save([...tasks,removed])); $('new-task').focus(); }});
      actions.append(edit,del);row.append(check,body,actions);list.append(row);
    }
    $('empty').hidden=filtered.length>0;
    const isSearch=Boolean(query)||priority!=='all';
    $('empty').querySelector('h3').textContent=isSearch?'No matching tasks.':view==='completed'?'No completed tasks.':'No tasks to do.';
    $('empty-add').hidden=isSearch||view==='completed';
    $('clear-completed').hidden=view!=='completed'||!done;

  }
  function openDialog(task=null) {
    editing=task?.id||null; $('task-form').reset(); $('dialog-title').textContent=task?'Edit task':'New task';
    $('task-title').value=task?.title||''; $('task-notes').value=task?.notes||''; $('task-priority').value=task?.priority||'medium'; $('task-due').value=task?.due||'';
    $('task-tags').value=task?.tags.join(', ')||'';
    $('task-title').setCustomValidity(''); $('task-dialog').showModal(); $('task-title').focus();
  }
  $('task-form').addEventListener('submit',e=>{ e.preventDefault(); const title=$('task-title').value.trim(); if(!title){$('task-title').setCustomValidity('Please give your task a name.');$('task-title').reportValidity();return;} const existing=tasks.find(t=>t.id===editing);const task={id:existing?.id||uid(),title,notes:$('task-notes').value,tags:normalizeTags($('task-tags').value.split(',')),priority:$('task-priority').value,due:$('task-due').value,done:existing?.done||false,created:existing?.created??Date.now()};if(save(existing?tasks.map(t=>t.id===editing?task:t):[...tasks,task])){$('task-dialog').close();notify(existing?'Task updated.':'Task added.');}});
  $('task-title').addEventListener('input',()=> $('task-title').setCustomValidity(''));
  ['new-task','empty-add'].forEach(id=>$(id).addEventListener('click',()=>openDialog()));
  ['close-dialog','cancel-dialog'].forEach(id=>$(id).addEventListener('click',()=> $('task-dialog').close()));
  $('views').addEventListener('click',e=>{const button=e.target.closest('[data-view]');if(!button)return;view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b===button);if(b===button)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();});
  ['search','priority-filter','sort'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
  $('clear-completed').addEventListener('click',()=>{const removed=tasks.filter(t=>t.done);if(save(tasks.filter(t=>!t.done)))notify(`${removed.length} completed task${removed.length===1?'':'s'} cleared.`,()=>save([...tasks,...removed.filter(x=>!tasks.some(t=>t.id===x.id))]));});
  $('undo').addEventListener('click',()=>{const action=undoAction;if(action && action())notify('Restored.');});
  $('export').addEventListener('click',()=>{const blob=new Blob([damagedStorage ? (localStorage.getItem(KEY) || '') : JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=`focus-${damagedStorage?'recovery':'tasks'}-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(damagedStorage ? 'Raw recovery copy exported. Keep it safe; it may need repair before importing.' : 'Backup exported. Import it on your other computer.');});
  $('import').addEventListener('click',()=> $('import-file').click());
  $('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10000000)throw new Error('Please choose a JSON backup smaller than 10 MB.');const parsed=JSON.parse(await file.text());if(!parsed || parsed.version!==1)throw new Error('Choose a valid Focus JSON backup (version 1).');const imported=validate(parsed.tasks);const fresh=imported.filter(t=>!tasks.some(x=>x.id===t.id));if(save([...tasks,...fresh]))notify(`Imported ${fresh.length} task${fresh.length===1?'':'s'}. Existing tasks were kept.`);}catch(error){notify(error instanceof SyntaxError?'That file is not valid JSON. Nothing was imported.':error.message);}finally{e.target.value='';}});
  function applyTheme(theme){document.documentElement.dataset.theme=theme;$('theme').textContent=theme==='dark'?'Light mode':'Dark mode';}
  $('theme').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(next);try{localStorage.setItem(THEME,next);}catch{notify('Theme changed, but browser storage is unavailable.');}});
  loadTasks();
  try { applyTheme(localStorage.getItem(THEME)|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')); }
  catch { applyTheme('light'); }
  window.addEventListener('storage',e=>{if(e.key===KEY || e.key===null){loadTasks();render();}});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&!$('task-dialog').open){e.preventDefault();$('search').focus();}});
  render();setInterval(render,60000);
})();
