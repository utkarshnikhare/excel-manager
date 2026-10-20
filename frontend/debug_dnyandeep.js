import fs from 'fs';
import { executeSmartSearch, transliterate, getSkeleton } from './src/utils/searchLogic.js';

const deeds = JSON.parse(fs.readFileSync('public/lohgaon_deeds.json', 'utf8'));
const d16060 = deeds.find(d => String(d.docno) === '16060');
console.log('Doc 16060 Buyer:', d16060.purchaserparty);
console.log('Transliterated:', transliterate(d16060.purchaserparty));
console.log('Buyer Skeleton:', getSkeleton(transliterate(d16060.purchaserparty)));
console.log('Query Skeleton of dnyandeep:', getSkeleton('dnyandeep'));

const res = executeSmartSearch([d16060], [{ column: 'purchaserparty', query: 'dnyandeep' }]);
console.log('Match result:', res.length);
