import fs from 'fs';

const deeds = JSON.parse(fs.readFileSync('public/lohgaon_deeds.json', 'utf8'));
let numCount = 0;
let strCount = 0;
let emptyCount = 0;
const sampleDates = [];

deeds.forEach((d, idx) => {
  if (typeof d.registrationdate === 'number') numCount++;
  else if (!d.registrationdate) emptyCount++;
  else strCount++;
  if (idx < 10) sampleDates.push(d.registrationdate);
});

console.log({ strCount, numCount, emptyCount });
console.log('Sample dates:', sampleDates);
