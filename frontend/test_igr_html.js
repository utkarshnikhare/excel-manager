import * as XLSX from 'xlsx';

const sampleTable = `<div>
	<table cellspacing="0" rules="all" border="1" id="ctl00_MainContent_GrdResult">
		<tr>
			<th scope="col">srocode</th><th scope="col">docno</th><th scope="col">docname</th><th scope="col">sellerparty</th><th scope="col">propertydescription</th>
		</tr><tr>
			<td>3</td><td>16060</td><td>गहाणखत</td><td>{"सौ श्लेषा अविनाश भोसले (कर्ज घेणार)-"}</td><td>गाव मौजे लोहगांव येथील स. नं. 284</td>
		</tr>
	</table>
</div>`;

try {
  // Test 1: Reading as string
  const wb1 = XLSX.read(sampleTable, { type: 'string' });
  console.log('Test 1 (string) SheetNames:', wb1.SheetNames);
  const json1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]]);
  console.log('Test 1 JSON:', json1);

  // Test 2: Reading as buffer/array
  const buf = Buffer.from(sampleTable, 'utf-8');
  const wb2 = XLSX.read(new Uint8Array(buf), { type: 'array' });
  console.log('Test 2 (array buffer) SheetNames:', wb2.SheetNames);
  const json2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);
  console.log('Test 2 JSON:', json2);
} catch (e) {
  console.error('Error:', e);
}
