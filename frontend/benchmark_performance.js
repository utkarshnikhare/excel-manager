import { performance } from 'perf_hooks';
import os from 'os';
import XLSX from 'xlsx';
import { executeSmartSearch, warmSearchIndex } from './src/utils/searchLogic.js';

console.log('================================================================');
console.log('⚡ BENCHMARK: PERFORMANCE, SEARCH TIMING & MEMORY AUDIT');
console.log('================================================================\n');

// 1. Hardware & Environment Telemetry
console.log('--- SYSTEM TELEMETRY ---');
console.log(`OS: ${os.type()} ${os.release()} (${os.arch()})`);
console.log(`CPU: ${os.cpus()[0]?.model} (${os.cpus().length} cores)`);
console.log(`Total System RAM: ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`);
console.log(`Node.js Runtime: ${process.version}\n`);

// 2. Dataset Synthesis: 10,000 rows across 50 files
console.log('--- DATASET GENERATION ---');
const t0_gen = performance.now();
const testRows = [];
const fileCount = 50;
const totalRows = 10000;
const rowsPerFile = totalRows / fileCount;

const firstNames = ['ज्ञानेश्वर', 'राहुल', 'अमित', 'सुनील', 'संजय', 'संदीप', 'विकास', 'अशोक', 'विशाल', 'गणेश'];
const middleNames = ['विठ्ठल', 'दत्तात्रय', 'नारायण', 'रामचंद्र', 'हरीदास', 'तुकाराम', 'बाळकृष्ण', 'शंकर'];
const lastNames = ['पाटील', 'शर्मा', 'देशमुख', 'मोझे', 'शिंदे', 'गायकवाड', 'चव्हाण', 'कदम', 'जाधव', 'कुलकर्णी'];
const societies = ['Aeropolis', 'Kalpataru Heights', 'Pride World City', 'VTP Pegasus', 'Rohan Abhilasha', 'Nyati Elysia'];
const deedTypes = ['खरेदीखत (Sale Deed)', 'Agreement to Sale', 'गहाणखत (Mortgage)', 'बक्षीसपत्र (Gift Deed)'];

for (let f = 1; f <= fileCount; f++) {
  const fileName = `IGR_Document_Batch_${f < 10 ? '0' + f : f}.xlsx`;
  for (let r = 1; r <= rowsPerFile; r++) {
    const fName = firstNames[(f + r) % firstNames.length];
    const mName = middleNames[(f * r) % middleNames.length];
    const lName = lastNames[(f + r * 2) % lastNames.length];
    const docNo = String(10000 + (f - 1) * rowsPerFile + r);
    const flatNo = String(101 + (r % 20));
    const society = societies[(f + r) % societies.length];
    const deed = deedTypes[(f + r) % deedTypes.length];
    const consideration = 2500000 + ((r * 15000) % 7500000);

    testRows.push({
      docno: docNo,
      registrationdate: `15/0${(r % 9) + 1}/2023`,
      docname: deed,
      sroname: 'हवेली क्र. ३ (Haveli 3)',
      party1: `${fName} ${mName} ${lName}`,
      party2: `M/s Builder Properties Ltd`,
      society: society,
      flat_no: flatNo,
      carpet_sqft: 550 + (r % 400),
      consideration_amt: consideration,
      marketvalue: consideration * 1.05,
      stampdutypaid: consideration * 0.07,
      source_file: fileName,
      source_sheet: 'Sheet1'
    });
  }
}
const t1_gen = performance.now();
console.log(`Generated ${testRows.length.toLocaleString()} rows across ${fileCount} files in ${(t1_gen - t0_gen).toFixed(2)} ms.`);

// 3. Search Index Pre-Warming
console.log('\n--- SEARCH INDEX WARM-UP ---');
const t0_warm = performance.now();
warmSearchIndex(testRows);
const t1_warm = performance.now();
console.log(`Warm-up completed in ${(t1_warm - t0_warm).toFixed(2)} ms.`);

// Memory footprint after indexing
const memAfterWarm = process.memoryUsage();
console.log(`Heap Used after Indexing: ${(memAfterWarm.heapUsed / (1024 * 1024)).toFixed(2)} MB`);

// 4. Multi-Iteration Search Benchmark
console.log('\n--- SEARCH TIMING BENCHMARK (10 REPETITIONS) ---');

const benchmarkQueries = [
  { name: 'Multilingual First+Last Name ("Dnyaneshwar Patil")', query: 'Dnyaneshwar Patil', exact: false },
  { name: 'Devanagari Exact Phrase ("ज्ञानेश्वर पाटील")', query: '"ज्ञानेश्वर पाटील"', exact: true },
  { name: 'Strict Match Single Word ("Aeropolis")', query: 'Aeropolis', exact: true },
  { name: 'English Transliteration ("Sanjay")', query: 'Sanjay', exact: false }
];

for (const bq of benchmarkQueries) {
  const timings = [];
  let matchCount = 0;

  for (let iter = 1; iter <= 10; iter++) {
    const start = performance.now();
    const results = executeSmartSearch(testRows, [{ column: 'ALL', query: bq.query }], 'AND', bq.exact);
    const end = performance.now();
    timings.push(end - start);
    matchCount = results.length;
  }

  const min = Math.min(...timings).toFixed(2);
  const max = Math.max(...timings).toFixed(2);
  const avg = (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2);
  console.log(`Query: ${bq.name}`);
  console.log(`   Matches Found: ${matchCount}`);
  console.log(`   Min: ${min} ms | Max: ${max} ms | Avg: ${avg} ms`);
}

// 5. Excel Generation Benchmark for 10,000 Rows
console.log('\n--- EXCEL EXPORT BENCHMARK (10,000 ROWS) ---');
const t0_export = performance.now();
const cleanRows = testRows.map(r => {
  const copy = {};
  for (let k in r) {
    if (!k.startsWith('_')) copy[k] = r[k];
  }
  return copy;
});
const ws = XLSX.utils.json_to_sheet(cleanRows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Benchmark_10K');
const exportBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const t1_export = performance.now();
console.log(`Generated 10,000-row XLSX (${(exportBuf.length / (1024 * 1024)).toFixed(2)} MB) in ${(t1_export - t0_export).toFixed(2)} ms.`);

console.log('\n================================================================');
console.log('✅ BENCHMARK AUDIT COMPLETE');
console.log('================================================================');
