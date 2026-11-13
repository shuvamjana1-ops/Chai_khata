/**
 * Hindi (Devanagari) ⇄ Hinglish (Roman Hindi) Localization & Transliteration Engine
 * Ensures that toggling between हिंदी and Hinglish converts every single UI label,
 * customer name, transaction note, supplier order item, unit, date, and WhatsApp message.
 */

const EXACT_PHRASE_MAP: Record<string, string> = {
  // Shop & Supplier defaults
  'शर्मा चाय एवं किराना (Sharma Chai)': 'Sharma Chai & Kirana Store',
  'शर्मा चाय एवं किराना': 'Sharma Chai & Kirana',
  'शर्मा चाय स्टॉल': 'Sharma Chai Stall',
  'अमूल डेयरी सप्लायर (Amul Dairy)': 'Amul Dairy Supplier',
  'अमूल डेयरी सप्लायर': 'Amul Dairy Supplier',
  'अमूल डेयरी': 'Amul Dairy',

  // Customer Names
  'रमेश': 'Ramesh',
  'रमेश भाई': 'Ramesh Bhai',
  'रमेश वर्मा': 'Ramesh Verma',
  'रमेश कुमार': 'Ramesh Kumar',
  'सुरेश': 'Suresh',
  'सुरेश भाई': 'Suresh Bhai',
  'मुन्ना ऑटो': 'Munna Auto',
  'मुन्ना': 'Munna',
  'प्रिया मैडम': 'Priya Madam',
  'प्रिया': 'Priya',
  'राजू मिस्त्री': 'Raju Mistri',
  'राजू': 'Raju',
  'नया ग्राहक': 'Naya Grahak',
  'ग्राहक': 'Grahak',

  // Seed Transaction Notes & Common Notes
  'चाय और मस्का बन (सुबह)': 'Chai aur Maska Bun (Subah)',
  'दूध और बिस्कुट पैकेट': 'Doodh aur Biscuit Packet',
  'किराना सामान व चाय पत्ती': 'Kirana Samaan aur Chai Patti',
  'नकद जमा किए': 'Nakad Jama Kiye',
  'नकद जमा': 'Nakad Jama',
  'चाय-समोसा (स्टैंड)': 'Chai-Samosa (Stand)',
  'चाय व नाश्ता': 'Chai aur Nashta',
  'चाय समोसा': 'Chai Samosa',
  'ब्रेड, मक्खन और दूध': 'Bread, Makkhan aur Doodh',
  '4 कप स्पेशल चाय और बिस्कुट': '4 Cup Special Chai aur Biscuit',
  'पूरा हिसाब चुकता': 'Poora Hisaab Chukta',
  'बोलकर उधार लिखा': 'Bolkar Udhaar Likha',
  'बोलकर जमा लिखा': 'Bolkar Jama Likha',
  'बिस्कुट और दूध': 'Biscuit aur Doodh',
  'राशन': 'Rashan',

  // Supplier Order Items
  'दूध (फुल क्रीम)': 'Doodh (Full Cream)',
  'दूध (Doodh)': 'Doodh (Milk)',
  'दूध': 'Doodh',
  'चीनी (शक्कर)': 'Cheeni (Shakkar)',
  'चीनी (Cheeni)': 'Cheeni (Sugar)',
  'चीनी': 'Cheeni',
  'असम कड़क चाय पत्ती': 'Assam Kadak Chai Patti',
  'चाय पत्ती (Chai Patti)': 'Chai Patti (Tea Leaves)',
  'चाय पत्ती': 'Chai Patti',
  'ताज़ा ब्रेड': 'Taaza Bread',
  'ब्रेड (Bread)': 'Bread Packet',
  'ब्रेड': 'Bread',
  'अदरक (Adrak)': 'Adrak (Ginger)',
  'अदरक': 'Adrak',
  'पारले-जी बिस्कुट': 'Parle-G Biscuit',
  'बिस्कुट (Biscuit)': 'Biscuit Packet',
  'बिस्कुट': 'Biscuit',
  'इलायची (Elaichi)': 'Elaichi (Cardamom)',
  'समोसा (Samosa)': 'Samosa',
  'नमकीन (Namkeen)': 'Namkeen',
  'मैदा (Maida)': 'Maida',
  'तेल (Oil)': 'Tel (Oil)',
  'सामान (Item)': 'Samaan (Item)',
  'सामान': 'Samaan',

  // Units & Dates
  'पैकेट': 'Packet',
  'किलो': 'Kilo',
  'लीटर': 'Litre',
  'पेटी': 'Peti',
  'पीस': 'Piece',
  'कल सुबह': 'Kal Subah',
  'आज शाम': 'Aaj Shaam',
};

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/शर्मा चाय एवं किराना/g, 'Sharma Chai & Kirana'],
  [/शर्मा चाय स्टॉल/g, 'Sharma Chai Stall'],
  [/अमूल डेयरी सप्लायर/g, 'Amul Dairy Supplier'],
  [/अमूल डेयरी/g, 'Amul Dairy'],
  [/रमेश वर्मा/g, 'Ramesh Verma'],
  [/रमेश कुमार/g, 'Ramesh Kumar'],
  [/रमेश भाई/g, 'Ramesh Bhai'],
  [/रमेश/g, 'Ramesh'],
  [/सुरेश भाई/g, 'Suresh Bhai'],
  [/सुरेश/g, 'Suresh'],
  [/मुन्ना ऑटो वाले/g, 'Munna Auto Wale'],
  [/मुन्ना ऑटो/g, 'Munna Auto'],
  [/मुन्ना/g, 'Munna'],
  [/प्रिया मैडम/g, 'Priya Madam'],
  [/प्रिया/g, 'Priya'],
  [/राजू मिस्त्री/g, 'Raju Mistri'],
  [/राजू/g, 'Raju'],
  [/चाय पत्ती/g, 'Chai Patti'],
  [/फुल क्रीम/g, 'Full Cream'],
  [/पारले-जी/g, 'Parle-G'],
  [/बिस्कुट/g, 'Biscuit'],
  [/बिस्किट/g, 'Biscuit'],
  [/मस्का बन/g, 'Maska Bun'],
  [/किराना सामान/g, 'Kirana Samaan'],
  [/स्पेशल चाय/g, 'Special Chai'],
  [/चाय-समोसा/g, 'Chai-Samosa'],
  [/चाय समोसा/g, 'Chai Samosa'],
  [/चाय/g, 'Chai'],
  [/समोसा/g, 'Samosa'],
  [/दूध/g, 'Doodh'],
  [/चीनी/g, 'Cheeni'],
  [/शक्कर/g, 'Shakkar'],
  [/ब्रेड/g, 'Bread'],
  [/मक्खन/g, 'Makkhan'],
  [/अदरक/g, 'Adrak'],
  [/इलायची/g, 'Elaichi'],
  [/राशन/g, 'Rashan'],
  [/सामान/g, 'Samaan'],
  [/पैकेट/g, 'Packet'],
  [/किलो/g, 'Kilo'],
  [/लीटर/g, 'Litre'],
  [/पेटी/g, 'Peti'],
  [/पीस/g, 'Piece'],
  [/कल सुबह/g, 'Kal Subah'],
  [/आज शाम/g, 'Aaj Shaam'],
  [/सुबह/g, 'Subah'],
  [/शाम/g, 'Shaam'],
  [/आज/g, 'Aaj'],
  [/कल/g, 'Kal'],
  [/उधार/g, 'Udhaar'],
  [/जमा/g, 'Jama'],
  [/बाकी/g, 'Baaki'],
  [/रुपये/g, 'Rupaye'],
  [/रुपया/g, 'Rupaye'],
  [/खाते/g, 'Khate'],
  [/खाता/g, 'Khata'],
  [/हिसाब/g, 'Hisaab'],
  [/चुकता/g, 'Chukta'],
  [/नकद/g, 'Nakad'],
  [/बोलकर/g, 'Bolkar'],
  [/हाथ से लिखा/g, 'Haath se likha'],
  [/लिखो/g, 'Likho'],
  [/लिखा/g, 'Likha'],
  [/मंगवाओ/g, 'Mangwao'],
  [/मंगवाना/g, 'Mangwana'],
  [/ऑर्डर/g, 'Order'],
  [/ग्राहक/g, 'Grahak'],
  [/किसके/g, 'Kiske'],
  [/किसका/g, 'Kiska'],
  [/कितने/g, 'Kitne'],
  [/कितना/g, 'Kitna'],
  [/दिए/g, 'Diye'],
  [/मिले/g, 'Mile'],
  [/किए/g, 'Kiye'],
  [/और/g, 'aur'],
];

const DEVANAGARI_VOWELS: Record<string, string> = {
  अ: 'a',
  आ: 'aa',
  इ: 'i',
  ई: 'ee',
  उ: 'u',
  ऊ: 'oo',
  ऋ: 'ri',
  ए: 'e',
  ऐ: 'ai',
  ओ: 'o',
  औ: 'au',
  अं: 'an',
  अः: 'ah',
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  'ा': 'a',
  'ि': 'i',
  'ी': 'ee',
  'ु': 'u',
  'ू': 'oo',
  'ृ': 'ri',
  'े': 'e',
  'ै': 'ai',
  'ो': 'o',
  'ौ': 'au',
  'ं': 'n',
  'ँ': 'n',
  'ः': 'h',
  'ॉ': 'o',
  'ॅ': 'e',
};

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  क: 'k',
  ख: 'kh',
  ग: 'g',
  घ: 'gh',
  ङ: 'n',
  च: 'ch',
  छ: 'chh',
  ज: 'j',
  झ: 'jh',
  ञ: 'n',
  ट: 't',
  ठ: 'th',
  ड: 'd',
  ढ: 'dh',
  ण: 'n',
  त: 't',
  थ: 'th',
  द: 'd',
  ध: 'dh',
  न: 'n',
  प: 'p',
  फ: 'ph',
  ब: 'b',
  भ: 'bh',
  म: 'm',
  य: 'y',
  र: 'r',
  ल: 'l',
  व: 'v',
  श: 'sh',
  ष: 'sh',
  स: 's',
  ह: 'h',
  क्ष: 'ksh',
  त्र: 'tr',
  ज्ञ: 'gy',
  ड़: 'r',
  ढ़: 'rh',
  फ़: 'f',
  ज़: 'z',
  क़: 'q',
};

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/**
 * Transliterates any remaining Devanagari word into clean Roman Hinglish
 */
function transliterateDevanagariWord(word: string): string {
  // Replace nukta combinations first
  const normalized = word
    .replace(/ड़/g, 'r')
    .replace(/ढ़/g, 'rh')
    .replace(/फ़/g, 'f')
    .replace(/ज़/g, 'z')
    .replace(/क़/g, 'q');

  let out = '';
  const chars = Array.from(normalized);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    // Digits
    const digitIdx = DEVANAGARI_DIGITS.indexOf(ch);
    if (digitIdx !== -1) {
      out += String(digitIdx);
      continue;
    }

    // Punctuation
    if (ch === '।' || ch === '॥') {
      out += '.';
      continue;
    }
    if (ch === '्' || ch === '़') {
      continue;
    }

    if (DEVANAGARI_VOWELS[ch]) {
      out += DEVANAGARI_VOWELS[ch];
      continue;
    }

    if (DEVANAGARI_MATRAS[ch]) {
      out += DEVANAGARI_MATRAS[ch];
      continue;
    }

    if (DEVANAGARI_CONSONANTS[ch]) {
      const base = DEVANAGARI_CONSONANTS[ch];
      if (next === '्') {
        // Halant suppresses inherent vowel
        out += base;
        i++;
      } else if (next && DEVANAGARI_MATRAS[next]) {
        // Matra follows consonant
        out += base + DEVANAGARI_MATRAS[next];
        i++;
      } else if (!next || !/[\u0900-\u097F]/.test(next)) {
        // Word-final consonant in Hindi generally drops schwa 'a'
        out += base;
      } else {
        out += base + 'a';
      }
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Converts any Hindi (Devanagari) string into clean Hinglish (Roman script).
 * Preserves numbers, symbols, and already-Roman words.
 */
export function toHinglish(text: string | null | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (EXACT_PHRASE_MAP[trimmed]) {
    return EXACT_PHRASE_MAP[trimmed];
  }

  // Strip redundant parenthetical English if the Hindi part already maps to it, e.g. "दूध (Doodh)" -> "Doodh"
  let working = trimmed
    .replace(/शर्मा चाय एवं किराना\s*\(Sharma Chai\)/g, 'Sharma Chai & Kirana')
    .replace(/अमूल डेयरी सप्लायर\s*\(Amul Dairy\)/g, 'Amul Dairy Supplier')
    .replace(/दूध\s*\(Doodh\)/g, 'Doodh')
    .replace(/चीनी\s*\(Cheeni\)/g, 'Cheeni')
    .replace(/चाय पत्ती\s*\(Chai Patti\)/g, 'Chai Patti')
    .replace(/ब्रेड\s*\(Bread\)/g, 'Bread')
    .replace(/बिस्कुट\s*\(Biscuit\)/g, 'Biscuit')
    .replace(/अदरक\s*\(Adrak\)/g, 'Adrak')
    .replace(/इलायची\s*\(Elaichi\)/g, 'Elaichi')
    .replace(/समोसा\s*\(Samosa\)/g, 'Samosa')
    .replace(/नमकीन\s*\(Namkeen\)/g, 'Namkeen')
    .replace(/मैदा\s*\(Maida\)/g, 'Maida')
    .replace(/तेल\s*\(Oil\)/g, 'Tel (Oil)');

  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    working = working.replace(pattern, replacement);
  }

  // If any Devanagari characters remain, transliterate token-by-token
  if (/[\u0900-\u097F]/.test(working)) {
    working = working.replace(/[\u0900-\u097F]+/g, (match) =>
      transliterateDevanagariWord(match)
    );
  }

  return working;
}

/**
 * Returns Hindi text when isHi=true, or Hinglish text when isHi=false.
 */
export function displayText(text: string | null | undefined, isHi: boolean): string {
  if (!text) return '';
  return isHi ? text : toHinglish(text);
}
