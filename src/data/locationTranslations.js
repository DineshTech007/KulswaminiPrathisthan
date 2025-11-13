const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

const RAW_MARATHI_MAP = [
  ['india', 'भारत'],
  ['bharat', 'भारत'],
  ['maharashtra', 'महाराष्ट्र'],
  ['karnataka', 'कर्नाटक'],
  ['telangana', 'तेलंगणा'],
  ['goa', 'गोवा'],
  ['gujarat', 'गुजरात'],
  ['madhya pradesh', 'मध्य प्रदेश'],
  ['uttar pradesh', 'उत्तर प्रदेश'],
  ['delhi', 'दिल्ली'],
  ['andhra pradesh', 'आंध्र प्रदेश'],
  ['tamil nadu', 'तमिळनाडू'],
  ['kerala', 'केरळ'],
  ['rajasthan', 'राजस्थान'],
  ['solapur', 'सोलापूर'],
  ['solapur district', 'सोलापूर'],
  ['pune', 'पुणे'],
  ['pune district', 'पुणे'],
  ['satara', 'सातारा'],
  ['sangli', 'सांगली'],
  ['kolhapur', 'कोल्हापूर'],
  ['osmanabad', 'उस्मानाबाद'],
  ['barshi', 'बार्शी'],
  ['mumbai', 'मुंबई'],
  ['thane', 'ठाणे'],
  ['nashik', 'नाशिक'],
  ['aurangabad', 'औरंगाबाद'],
  ['latur', 'लातूर'],
  ['nagpur', 'नागपूर'],
  ['jalna', 'जालना'],
  ['akola', 'अकोला'],
  ['ahmednagar', 'अहमदनगर'],
  ['beed', 'बीड'],
  ['nanded', 'नांदेड'],
  ['hingoli', 'हिंगोली'],
  ['parbhani', 'परभणी'],
  ['bidar', 'बिदर'],
  ['hyderabad', 'हैदराबाद'],
  ['dubai', 'दुबई'],
  ['shirdi', 'शिर्डी'],
  ['pandharpur', 'पंढरपूर'],
  ['solapur city', 'सोलापूर शहर'],
  ['solapur rural', 'सोलापूर ग्रामीण'],
  ['governador', 'गोविंद'],
];

const PLACE_DICTIONARY = new Map(
  RAW_MARATHI_MAP.map(([key, value]) => [key.toLowerCase(), value])
);

export function translatePlaceName(value, language = 'mr') {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (language !== 'mr') return trimmed;
  if (DEVANAGARI_REGEX.test(trimmed)) {
    return trimmed;
  }
  const lookupKey = trimmed.toLowerCase();
  return PLACE_DICTIONARY.get(lookupKey) || trimmed;
}

export function translateLocationParts(values = [], language = 'mr') {
  if (!Array.isArray(values)) return [];
  return values.map((value) => translatePlaceName(value, language));
}

export default translatePlaceName;
