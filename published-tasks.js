'use strict';
// Append new tasks with permanent, unique IDs. Never reuse an ID for a new task.
// These published starter entries are public; browser edits are never uploaded.
globalThis.focusPublishedTasks = [
  {
    id: 'lab-cal-placenta-261102',
    title: 'Cal Placenta',
    notes: 'Sample date: 261102 (2026-11-02). Tissue clearing with CUBIC-R. Completed.',
    priority: 'medium', due: '', done: true, created: 1794009600000
  },
  ...['PVC', 'polypropylene', 'polyethylene', 'PET', 'nylon', 'polystyrene'].map((material, index) => ({
    id: `lab-dans-${material.toLowerCase()}`,
    title: `Stain ${material} with DANS`,
    notes: 'Degradation study. Fenton’s treatment completed. Next: DANS staining.',
    priority: 'medium', due: '', done: false, created: 1794009600001 + index
  })),
  ...['PVC', 'polypropylene', 'polyethylene', 'PET', 'nylon', 'polystyrene'].map((material, index) => ({
    id: `lab-anodisc-control-${material.toLowerCase()}`,
    title: `Place ${material} control on an Anodisc`,
    notes: `Degradation study control group. Place ${material} onto an Anodisc.`,
    priority: 'medium', due: '', done: false, created: 1794009600007 + index
  }))
];
