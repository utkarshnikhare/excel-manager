import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Sample of real records from user's provided IGR Maharashtra Lohgaon data
const records2023 = [
  {
    srocode: 3,
    internaldocumentnumber: 140046,
    docno: 16060,
    docname: "गहाणखत",
    registrationdate: "12/10/2023",
    sroname: "सह दु.नि. हवेली 3",
    sellerparty: "सौ श्लेषा अविनाश भोसले (कर्ज घेणार), श्री अविनाश चंद्रकांत भोसले",
    purchaserparty: "ज्ञानदीप को ऑप क्रेडिट सोसायटी लि मुंबई",
    propertydescription: "गांव मौजे लोहगांव येथील स. नं. 284 हि. नं. 3 व स. नं. 284 हि. नं. 4 स्कायवेज एस्फेरा 2 विंग ए 106",
    areaname: "लोहगांव",
    consideration_amt: 3000000,
    marketvalue: 0,
    stampdutypaid: 9000,
    registrationfees: 15000,
    status: "c"
  },
  {
    srocode: 4,
    internaldocumentnumber: 109968,
    docno: 17762,
    docname: "असाईनमेंट डीड",
    registrationdate: "20/09/2023",
    sroname: "सह दु.नि. हवेली 4",
    sellerparty: "रीना जोसेफ, मारिया जोसेफ क्रिस्टोफर एजी",
    purchaserparty: "योगेश सुभाष कळंबे",
    propertydescription: "गाव मौजे लोहगाव सर्व्हे नं. 284 एरोपोलीस इ विंग फ्लॅट क्र. 612",
    areaname: "लोहगांव",
    consideration_amt: 6500000,
    marketvalue: 4854982.4,
    stampdutypaid: 455000,
    registrationfees: 30000,
    status: "c"
  },
  {
    srocode: 8,
    internaldocumentnumber: 111286,
    docno: 12046,
    docname: "करारनामा",
    registrationdate: "06/01/2023",
    sroname: "सह दु.नि. हवेली 8",
    sellerparty: "मे मोझे असोसिएटस तर्फे भागीदार अजय नामदेव मोझे",
    purchaserparty: "शोभा कुमारी, जितेंद्र कुमार",
    propertydescription: "गांव मौजे लोहगांव येथील स नं 284 हि नं 3 व 4 स्कायवेज एस्फेरा बी विंग 504",
    areaname: "लोहगांव",
    consideration_amt: 3399120,
    marketvalue: 2621293.92,
    stampdutypaid: 238000,
    registrationfees: 30000,
    status: "c"
  },
  {
    srocode: 8,
    internaldocumentnumber: 112667,
    docno: 3027,
    docname: "ट्रान्सफर डीड",
    registrationdate: "17/02/2023",
    sroname: "सह दु.नि. हवेली 8",
    sellerparty: "ध्रुव रमेशलाल अरोरा",
    purchaserparty: "रोहन त्रिभुवन शाह, नितिशा रोहन शाह",
    propertydescription: "गाव मौजे लोहगाव सर्वे नं. 284/2 प्राईड आशियाना इ-2 फ्लॅट नं. 1102",
    areaname: "लोहगांव",
    consideration_amt: 7400000,
    marketvalue: 6619093.6,
    stampdutypaid: 518000,
    registrationfees: 30000,
    status: "c"
  },
  {
    srocode: 8,
    internaldocumentnumber: 114178,
    docno: 6609,
    docname: "करारनामा",
    registrationdate: "12/04/2023",
    sroname: "सह दु.नि. हवेली 8",
    sellerparty: "नितीन बबन मोझे",
    purchaserparty: "वैभव किसनराव कुडके",
    propertydescription: "गांव मौजे लोहगांव स नं 284 स्कायवेज एस्फेरा 2 विंग ए 1110",
    areaname: "लोहगांव",
    consideration_amt: 5800275,
    marketvalue: 4039973.84,
    stampdutypaid: 406100,
    registrationfees: 30000,
    status: "c"
  }
];

const records2024 = [
  {
    srocode: 3,
    internaldocumentnumber: 154118,
    docno: 22817,
    docname: "असाईनमेंट डीड",
    registrationdate: "12/09/2024",
    sroname: "सह दु.नि. हवेली 3",
    sellerparty: "अश्विनी संदेश नरके",
    purchaserparty: "सीता नरेंद्र दुबे",
    propertydescription: "गांव मौजे लोहगांव स. नं. 284 स्कायवेज एस्फेरा 2 विंग ए 1108",
    areaname: "लोहगांव",
    consideration_amt: 3000000,
    marketvalue: 2459656.96,
    stampdutypaid: 180000,
    registrationfees: 30000,
    status: "c"
  },
  {
    srocode: 8,
    internaldocumentnumber: 128132,
    docno: 14065,
    docname: "असाईनमेंट डीड",
    registrationdate: "04/07/2024",
    sroname: "सह दु.नि. हवेली 8",
    sellerparty: "राजीव कुमार विग, अंजू विग",
    purchaserparty: "विवेक कुमार खरे, आकांक्षा खरे",
    propertydescription: "गाव मौजे लोहगाव सर्वे नं. 284 प्राईड आशियाना जी-3 फ्लॅट नं. 903",
    areaname: "लोहगांव",
    consideration_amt: 10000000,
    marketvalue: 6529512.32,
    stampdutypaid: 700000,
    registrationfees: 30000,
    status: "c"
  },
  {
    srocode: 8,
    internaldocumentnumber: 130706,
    docno: 21883,
    docname: "ट्रान्सफर डीड",
    registrationdate: "16/10/2024",
    sroname: "सह दु.नि. हवेली 8",
    sellerparty: "उर्वी गौरव श्रीवास्तव",
    purchaserparty: "इंद्रकांत भार्गव, गायत्री भार्गव",
    propertydescription: "गाव मौजे लोहगांव स.नं. 284/2 प्राईड आशियाना डी-1 903",
    areaname: "लोहगांव",
    consideration_amt: 9450000,
    marketvalue: 6560814.08,
    stampdutypaid: 661500,
    registrationfees: 30000,
    status: "c"
  }
];

const records2025_2026 = [
  {
    srocode: 1,
    internaldocumentnumber: 136416,
    docno: 25891,
    docname: "करारनामा",
    registrationdate: "20/11/2025",
    sroname: "सह दु.नि.हवेली 1",
    sellerparty: "सौ. लिना किशोर जोशी",
    purchaserparty: "ऐश्वर्या सुरेश नलावडे, श्री. शुभम राजेश पाखरे",
    propertydescription: "गाव मौजे लोहगांव सर्वे नं. 284 हिस्सा नं. 4 एरोपोलीस फेज 01 विंग ए फ्लॅट नं. 1105",
    areaname: "लोहगांव",
    consideration_amt: 6000000,
    marketvalue: 5281162.232,
    stampdutypaid: 420000,
    registrationfees: 30000,
    status: "c"
  },
  {
    srocode: 8,
    internaldocumentnumber: 145025,
    docno: 8184,
    docname: "असाईनमेंट डीड",
    registrationdate: "23/03/2026",
    sroname: "सह दु.नि. हवेली 8",
    sellerparty: "करण रवी अगरवाल एच.यु.एफ",
    purchaserparty: "धृति मिश्रा, आदित्य पाण्डेय",
    propertydescription: "गाव मौजे लोहेगाव स.नं.284 प्राईड आशियाना ए-1 फ्लॅट नं.302",
    areaname: "लोहगांव",
    consideration_amt: 5800000,
    marketvalue: 4379993.744,
    stampdutypaid: 406000,
    registrationfees: 30000,
    status: "c"
  }
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records2023), "2023_Property_Deeds");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records2024), "2024_Property_Deeds");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records2025_2026), "2025_2026_Property_Deeds");

const out1 = path.join(process.cwd(), 'public', 'Lohgaon_Property_Records.xlsx');
const out2 = path.join(process.cwd(), '..', 'Lohgaon_Property_Records.xlsx');

XLSX.writeFile(wb, out1);
XLSX.writeFile(wb, out2);
console.log('✅ Created real Maharashtra IGR Property Registration Excel file with 3 sheets at:', out1);
