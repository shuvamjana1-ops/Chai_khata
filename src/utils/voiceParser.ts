import {
  Customer,
  OrderItem,
  SampleVoiceCommand,
  VoiceAction,
  VoiceParseResult,
} from '../types/ledger';

export const SAFETY_THRESHOLD_INR = 5000;

export const GEMINI_VOICE_SYSTEM_PROMPT = `You are "ChaiKhata AI", an expert Hindi, Hinglish, and Indian English voice ledger assistant for small shopkeepers (chaiwalas, kirana stores, dairy booths) in India.
Your job is to listen to recorded shopkeeper audio (often in noisy environments) or read a spoken transcript, and return ONLY valid JSON matching the exact schema below.

## OUTPUT JSON SCHEMA
{
  "transcript": string,
  "actions": [
    {
      "intent": "ADD_CREDIT" | "RECEIVE_PAYMENT" | "ADD_ORDER_ITEM" | "QUERY_BALANCE" | "LIST_PENDING",
      "customer": string | null,
      "amount": number | null,
      "item": string | null,
      "quantity": number | null,
      "unit": string | null,
      "forDate": string | null
    }
  ],
  "needs_clarification": boolean,
  "clarification_question_hi": string
}

## RULES
1. Support MULTIPLE actions in a single sentence (e.g. recording udhaar AND ordering milk for tomorrow).
2. Convert all Hindi/Hinglish number words into numbers:
   - ek=1, do=2, teen=3, chaar=4, paanch=5, che=6, saat=7, aath=8, nau=9, das=10
   - gyarah=11, barah=12, pandrah=15, bees=20, pachis=25, tees=30, chalis=40, pachas=50, saath=60, sattar=70, assi=80, nabbe=90
   - sau=100, dedh sau=150, do sau=200, dhai sau=250, teen sau=300, paanch sau=500, hazaar=1000, dedh hazaar=1500, do hazaar=2000, paanch hazaar=5000, das hazaar=10000
   - सवा सौ=125, डेढ़ सौ=150, ढाई सौ=250, साढ़े तीन सौ=350
3. Honorifics like "bhai", "bhaiya", "ji", "chacha", "didi", "madam", "mistri" should be preserved or normalized cleanly in the customer name.
4. Intent rules:
   - "udhaar likho", "khate mein daalo", "baaki likho", "ke naam likho" -> ADD_CREDIT
   - "diye", "jama kiye", "aa gaye", "mil gaye", "payment aaya", "chuka diye" -> RECEIVE_PAYMENT
   - "mangwao", "order likho", "kal subah chahiye", "laana hai", "bhejna" -> ADD_ORDER_ITEM
   - "kitna baaki hai", "hisaab batao", "balance kya hai" -> QUERY_BALANCE
   - "kiska udhaar baaki hai", "sabka baaki batao", "pending list dikhao" -> LIST_PENDING
5. If an ADD_CREDIT or RECEIVE_PAYMENT is missing an amount or customer name, set needs_clarification=true and provide a polite, short Hindi question in clarification_question_hi (e.g. "रमेश के कितने रुपये लिखने हैं?").

## 12 FEW-SHOT EXAMPLES

Example 1 (Multi-intent: Credit + Order):
Input: "Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao"
Output:
{
  "transcript": "रमेश के 40 रुपये उधार लिखो और कल सुबह 20 पैकेट दूध मंगवाओ",
  "actions": [
    {"intent": "ADD_CREDIT", "customer": "Ramesh", "amount": 40, "item": null, "quantity": null, "unit": null, "forDate": null},
    {"intent": "ADD_ORDER_ITEM", "customer": null, "amount": null, "item": "दूध (Doodh)", "quantity": 20, "unit": "पैकेट", "forDate": "कल सुबह"}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 2 (Hindi number words - Credit):
Input: "Suresh bhai ke chalis rupaye chai samosa ke khate mein likh do"
Output:
{
  "transcript": "सुरेश भाई के 40 रुपये चाय समोसा के खाते में लिख दो",
  "actions": [
    {"intent": "ADD_CREDIT", "customer": "Suresh", "amount": 40, "item": "चाय समोसा", "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 3 (Payment received):
Input: "Ramesh ne sau rupaye diye"
Output:
{
  "transcript": "रमेश ने 100 रुपये दिए",
  "actions": [
    {"intent": "RECEIVE_PAYMENT", "customer": "Ramesh", "amount": 100, "item": null, "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 4 (Payment with dedh sau):
Input: "Munna auto wale ne dedh sau rupaye jama kiye"
Output:
{
  "transcript": "मुन्ना ऑटो वाले ने 150 रुपये जमा किए",
  "actions": [
    {"intent": "RECEIVE_PAYMENT", "customer": "Munna Auto", "amount": 150, "item": null, "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 5 (Supplier Order with multiple items):
Input: "Kal ke liye 5 kilo cheeni aur 2 kilo chai patti order mein likho"
Output:
{
  "transcript": "कल के लिए 5 किलो चीनी और 2 किलो चाय पत्ती ऑर्डर में लिखो",
  "actions": [
    {"intent": "ADD_ORDER_ITEM", "customer": null, "amount": null, "item": "चीनी (Cheeni)", "quantity": 5, "unit": "किलो", "forDate": "कल सुबह"},
    {"intent": "ADD_ORDER_ITEM", "customer": null, "amount": null, "item": "चाय पत्ती (Chai Patti)", "quantity": 2, "unit": "किलो", "forDate": "कल सुबह"}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 6 (Query individual balance):
Input: "Ramesh ka kitna baaki hai?"
Output:
{
  "transcript": "रमेश का कितना बाकी है?",
  "actions": [
    {"intent": "QUERY_BALANCE", "customer": "Ramesh", "amount": null, "item": null, "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 7 (List top pending customers):
Input: "Aaj kiska udhaar baaki hai?"
Output:
{
  "transcript": "आज किसका उधार बाकी है?",
  "actions": [
    {"intent": "LIST_PENDING", "customer": null, "amount": null, "item": null, "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 8 (Priya Madam credit):
Input: "Priya madam ke dhai sau rupaye biscuit aur doodh ke udhaar likho"
Output:
{
  "transcript": "प्रिया मैडम के 250 रुपये बिस्कुट और दूध के उधार लिखो",
  "actions": [
    {"intent": "ADD_CREDIT", "customer": "Priya Madam", "amount": 250, "item": "बिस्कुट और दूध", "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 9 (Raju Mistri credit + payment in one go):
Input: "Raju mistri ne pachas rupaye diye aur 10 packet bread kal mangwana"
Output:
{
  "transcript": "राजू मिस्त्री ने 50 रुपये दिए और 10 पैकेट ब्रेड कल मंगवाना",
  "actions": [
    {"intent": "RECEIVE_PAYMENT", "customer": "Raju Mistri", "amount": 50, "item": null, "quantity": null, "unit": null, "forDate": null},
    {"intent": "ADD_ORDER_ITEM", "customer": null, "amount": null, "item": "ब्रेड (Bread)", "quantity": 10, "unit": "पैकेट", "forDate": "कल सुबह"}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 10 (High amount safety check trigger):
Input: "Suresh ke che hazaar rupaye rashan ke udhaar likho"
Output:
{
  "transcript": "सुरेश के 6000 रुपये राशन के उधार लिखो",
  "actions": [
    {"intent": "ADD_CREDIT", "customer": "Suresh", "amount": 6000, "item": "राशन", "quantity": null, "unit": null, "forDate": null}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}

Example 11 (Missing amount -> Needs clarification):
Input: "Ramesh ke naam udhaar likh do"
Output:
{
  "transcript": "रमेश के नाम उधार लिख दो",
  "actions": [],
  "needs_clarification": true,
  "clarification_question_hi": "रमेश के कितने रुपये उधार लिखने हैं?"
}

Example 12 (Missing customer -> Needs clarification):
Input: "50 rupaye udhaar likho"
Output:
{
  "transcript": "50 रुपये उधार लिखो",
  "actions": [],
  "needs_clarification": true,
  "clarification_question_hi": "50 रुपये किसके खाते में लिखने हैं?"
}
`;

export const SAMPLE_VOICE_COMMANDS: SampleVoiceCommand[] = [
  {
    id: 'cmd-1',
    category: 'multi',
    textHi: 'रमेश के 40 रुपये उधार लिखो और कल सुबह 20 पैकेट दूध मंगवाओ',
    textHinglish: 'Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao',
    meaningEn: 'Add ₹40 credit for Ramesh + order 20 packets of milk for tomorrow morning',
    expectedSummaryHi: 'रमेश — ₹40 उधार, और कल का ऑर्डर — 20 पैकेट दूध',
  },
  {
    id: 'cmd-2',
    category: 'credit',
    textHi: 'सुरेश भाई के चालीस रुपये चाय समोसा के लिखो',
    textHinglish: 'Suresh bhai ke chalis rupaye chai samosa ke likho',
    meaningEn: 'Record ₹40 credit for Suresh Bhai (Hindi number word "chalis")',
    expectedSummaryHi: 'सुरेश भाई — ₹40 उधार',
  },
  {
    id: 'cmd-3',
    category: 'payment',
    textHi: 'रमेश ने सौ रुपये दिए',
    textHinglish: 'Ramesh ne sau rupaye diye',
    meaningEn: 'Receive ₹100 payment from Ramesh (reduces balance)',
    expectedSummaryHi: 'रमेश — ₹100 जमा (मिले)',
  },
  {
    id: 'cmd-4',
    category: 'payment',
    textHi: 'मुन्ना ऑटो वाले ने डेढ़ सौ रुपये जमा किए',
    textHinglish: 'Munna auto wale ne dedh sau rupaye jama kiye',
    meaningEn: 'Receive ₹150 payment from Munna Auto ("dedh sau" = 150)',
    expectedSummaryHi: 'मुन्ना ऑटो — ₹150 जमा (मिले)',
  },
  {
    id: 'cmd-5',
    category: 'order',
    textHi: 'कल सुबह 5 किलो चीनी और 2 किलो चाय पत्ती मंगवाओ',
    textHinglish: 'Kal subah 5 kilo cheeni aur 2 kilo chai patti mangwao',
    meaningEn: 'Add 5 kg sugar and 2 kg tea leaves to tomorrow supplier order',
    expectedSummaryHi: 'कल का ऑर्डर — 5 किलो चीनी, 2 किलो चाय पत्ती',
  },
  {
    id: 'cmd-6',
    category: 'query',
    textHi: 'रमेश का कितना बाकी है?',
    textHinglish: 'Ramesh ka kitna baaki hai?',
    meaningEn: 'Check and speak Ramesh’s current pending balance aloud',
    expectedSummaryHi: 'रमेश का बाकी हिसाब बोलकर सुनाएं',
  },
  {
    id: 'cmd-7',
    category: 'query',
    textHi: 'आज किसका उधार बाकी है?',
    textHinglish: 'Aaj kiska udhaar baaki hai?',
    meaningEn: 'List and read aloud top customers with pending balance',
    expectedSummaryHi: 'कुल बाकी ग्राहकों की सूची सुनाएं',
  },
  {
    id: 'cmd-8',
    category: 'credit',
    textHi: 'प्रिया मैडम के ढाई सौ रुपये उधार लिखो',
    textHinglish: 'Priya madam ke dhai sau rupaye udhaar likho',
    meaningEn: 'Record ₹250 credit for Priya Madam ("dhai sau" = 250)',
    expectedSummaryHi: 'प्रिया मैडम — ₹250 उधार',
  },
  {
    id: 'cmd-9',
    category: 'multi',
    textHi: 'राजू मिस्त्री ने 50 रुपये दिए और 10 पैकेट ब्रेड कल मंगवाना',
    textHinglish: 'Raju mistri ne 50 rupaye diye aur 10 packet bread kal mangwana',
    meaningEn: 'Record ₹50 payment from Raju Mistri + order 10 bread packets',
    expectedSummaryHi: 'राजू मिस्त्री — ₹50 जमा, और 10 पैकेट ब्रेड ऑर्डर',
  },
  {
    id: 'cmd-10',
    category: 'credit',
    textHi: 'सुरेश के 6000 रुपये राशन के उधार लिखो',
    textHinglish: 'Suresh ke 6000 rupaye rashan ke udhaar likho',
    meaningEn: 'Record ₹6,000 credit (triggers >₹5,000 high-amount safety alert)',
    expectedSummaryHi: 'सुरेश — ₹6,000 उधार (बड़ी रकम की अतिरिक्त पुष्टि)',
  },
];

// Multi-word and single-word Hindi/Hinglish numbers
const COMPOUND_NUMBERS: Array<[RegExp, number]> = [
  [/\b(?:paanch\s*hazaar|panch\s*hazar|पांच\s*हजार|पाँच\s*हज़ार)\b/i, 5000],
  [/\b(?:che\s*hazaar|chhah\s*hazar|छह\s*हजार|छः\s*हज़ार)\b/i, 6000],
  [/\b(?:das\s*hazaar|दस\s*हजार)\b/i, 10000],
  [/\b(?:do\s*hazaar|दो\s*हजार)\b/i, 2000],
  [/\b(?:dedh\s*hazaar|डेढ़\s*हजार)\b/i, 1500],
  [/\b(?:ek\s*hazaar|hazaar|hazar|एक\s*हजार|हजार)\b/i, 1000],
  [/\b(?:paanch\s*sau|panch\s*sau|पांच\s*सौ|पाँच\s*सौ)\b/i, 500],
  [/\b(?:chaar\s*sau|char\s*sau|चार\s*सौ)\b/i, 400],
  [/\b(?:sadhe\s*teen\s*sau|साढ़े\s*तीन\s*सौ)\b/i, 350],
  [/\b(?:teen\s*sau|तीन\s*सौ)\b/i, 300],
  [/\b(?:dhai\s*sau|dhaai\s*sau|ढाई\s*सौ)\b/i, 250],
  [/\b(?:do\s*sau|दो\s*सौ)\b/i, 200],
  [/\b(?:dedh\s*sau|डेढ़\s*सौ)\b/i, 150],
  [/\b(?:sawa\s*sau|सवा\s*सौ)\b/i, 125],
  [/\b(?:ek\s*sau|sau|एक\s*सौ|सौ)\b/i, 100],
  [/\b(?:nabbe|नब्बे)\b/i, 90],
  [/\b(?:assi|अस्सी)\b/i, 80],
  [/\b(?:sattar|सत्तर)\b/i, 70],
  [/\b(?:saath|sath|साठ)\b/i, 60],
  [/\b(?:pachas|pachaas|पचास)\b/i, 50],
  [/\b(?:chalis|chaalis|चालीस)\b/i, 40],
  [/\b(?:paintis|paitis|पैंतीस)\b/i, 35],
  [/\b(?:tees|तीस)\b/i, 30],
  [/\b(?:pachis|pachees|पच्चीस)\b/i, 25],
  [/\b(?:bees|बीस)\b/i, 20],
  [/\b(?:pandrah|पंद्रह)\b/i, 15],
  [/\b(?:barah|बारह)\b/i, 12],
  [/\b(?:gyarah|ग्यारह)\b/i, 11],
  [/\b(?:das|दस)\b/i, 10],
  [/\b(?:nau|नौ)\b/i, 9],
  [/\b(?:aath|आठ)\b/i, 8],
  [/\b(?:saat|सात)\b/i, 7],
  [/\b(?:che|chhah|छह)\b/i, 6],
  [/\b(?:paanch|panch|पांच|पाँच)\b/i, 5],
  [/\b(?:chaar|char|चार)\b/i, 4],
  [/\b(?:teen|तीन)\b/i, 3],
  [/\b(?:do|दो)\b/i, 2],
  [/\b(?:ek|एक)\b/i, 1],
];

// Normalize Devanagari digits (०-९) to ASCII digits (0-9)
export function normalizeDevanagariDigits(input: string): string {
  const devDigits = '०१२३४५६७८९';
  return input.replace(/[०-९]/g, (d) => String(devDigits.indexOf(d)));
}

export function extractNumberFromText(clause: string): number | null {
  const normalized = normalizeDevanagariDigits(clause.replace(/,/g, ''));

  // First check compound Hindi number words (e.g., "dedh sau", "dhai sau", "chalis")
  for (const [regex, val] of COMPOUND_NUMBERS) {
    if (regex.test(normalized)) {
      // Also check if there is an explicit digit right before rupaye/packet/kilo; prefer explicit multi-digit if present
      const digitMatch = normalized.match(/(\d+(?:\.\d+)?)/);
      if (digitMatch && Number(digitMatch[1]) > 0) {
        return Number(digitMatch[1]);
      }
      return val;
    }
  }

  // Match Devanagari words without \b (since JS \b only matches ASCII word boundaries)
  const devanagariWordMap: Array<[string, number]> = [
    ['पांच हजार', 5000],
    ['पाँच हज़ार', 5000],
    ['छह हजार', 6000],
    ['दस हजार', 10000],
    ['दो हजार', 2000],
    ['डेढ़ हजार', 1500],
    ['एक हजार', 1000],
    ['हजार', 1000],
    ['पांच सौ', 500],
    ['चार सौ', 400],
    ['तीन सौ', 300],
    ['ढाई सौ', 250],
    ['दो सौ', 200],
    ['डेढ़ सौ', 150],
    ['सवा सौ', 125],
    ['एक सौ', 100],
    ['सौ', 100],
    ['नब्बे', 90],
    ['अस्सी', 80],
    ['सत्तर', 70],
    ['साठ', 60],
    ['पचास', 50],
    ['चालीस', 40],
    ['पैंतीस', 35],
    ['तीस', 30],
    ['पच्चीस', 25],
    ['बीस', 20],
    ['पंद्रह', 15],
    ['बारह', 12],
    ['ग्यारह', 11],
    ['दस', 10],
    ['नौ', 9],
    ['आठ', 8],
    ['सात', 7],
    ['छह', 6],
    ['पांच', 5],
    ['पाँच', 5],
    ['चार', 4],
    ['तीन', 3],
    ['दो', 2],
    ['एक', 1],
  ];

  const digitMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  for (const [word, val] of devanagariWordMap) {
    if (normalized.includes(word)) {
      return val;
    }
  }

  return null;
}

const KNOWN_CUSTOMER_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /(?:ramesh\s*verma|रमेश\s*वर्मा)/i, canonical: 'Ramesh Verma' },
  { pattern: /(?:ramesh\s*kumar|रमेश\s*कुमार)/i, canonical: 'Ramesh Kumar' },
  { pattern: /(?:ramesh|रमेश)/i, canonical: 'Ramesh' },
  { pattern: /(?:suresh|सुरेश)/i, canonical: 'Suresh' },
  { pattern: /(?:munna\s*auto|munna|मुन्ना\s*ऑटो|मुन्ना)/i, canonical: 'Munna Auto' },
  { pattern: /(?:priya\s*madam|priya|प्रिया\s*मैडम|प्रिया)/i, canonical: 'Priya Madam' },
  { pattern: /(?:raju\s*mistri|raju|राजू\s*मिस्त्री|राजू)/i, canonical: 'Raju Mistri' },
  { pattern: /(?:vijay|विजय)/i, canonical: 'Vijay' },
  { pattern: /(?:ashok|अशोक)/i, canonical: 'Ashok' },
  { pattern: /(?:dinesh|दिनेश)/i, canonical: 'Dinesh' },
  { pattern: /(?:sunita|सुनीता)/i, canonical: 'Sunita' },
  { pattern: /(?:pappu|पप्पू)/i, canonical: 'Pappu' },
];

const KNOWN_ORDER_ITEMS: Array<{ pattern: RegExp; item: string; defaultUnit: string }> = [
  { pattern: /(?:doodh|dudh|milk|दूध)/i, item: 'दूध (Doodh)', defaultUnit: 'पैकेट' },
  { pattern: /(?:cheeni|chini|sugar|चीनी|शक्कर)/i, item: 'चीनी (Cheeni)', defaultUnit: 'किलो' },
  { pattern: /(?:chai\s*patti|patti|tea|चाय\s*पत्ती|पत्ती)/i, item: 'चाय पत्ती (Chai Patti)', defaultUnit: 'किलो' },
  { pattern: /(?:bread|ब्रेड)/i, item: 'ब्रेड (Bread)', defaultUnit: 'पैकेट' },
  { pattern: /(?:biscuit|biskut|बिस्कुट|बिस्किट)/i, item: 'बिस्कुट (Biscuit)', defaultUnit: 'पैकेट' },
  { pattern: /(?:adrak|ginger|अदरक)/i, item: 'अदरक (Adrak)', defaultUnit: 'किलो' },
  { pattern: /(?:elaichi|इलायची)/i, item: 'इलायची (Elaichi)', defaultUnit: 'पैकेट' },
  { pattern: /(?:samosa|समोसा)/i, item: 'समोसा (Samosa)', defaultUnit: 'पीस' },
  { pattern: /(?:namkeen|नमकीन)/i, item: 'नमकीन (Namkeen)', defaultUnit: 'पैकेट' },
  { pattern: /(?:maida|मैदा)/i, item: 'मैदा (Maida)', defaultUnit: 'किलो' },
  { pattern: /(?:tel|oil|तेल)/i, item: 'तेल (Oil)', defaultUnit: 'लीटर' },
];

function extractCustomerFromClause(clause: string): string | null {
  for (const entry of KNOWN_CUSTOMER_PATTERNS) {
    if (entry.pattern.test(clause)) {
      return entry.canonical;
    }
  }
  // Try generic extraction before "ke", "ka", "ne", "को", "के", "ने", "का"
  const genericMatch = clause.match(
    /^([A-Za-z\u0900-\u097F]+(?:\s+(?:bhai|bhaiya|ji|madam|mistri|auto|चाचा|भाई|भैया|जी|मैडम|मिस्त्री))?)\s+(?:ke|ka|ki|ne|ko|के|का|की|ने|को)\b/i
  );
  if (genericMatch) {
    const candidate = genericMatch[1].trim();
    const stopWords = ['aaj', 'kal', 'subah', 'kiska', 'kitna', 'आज', 'कल', 'सुबह', 'किसका', 'कितना'];
    if (!stopWords.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return null;
}

function extractUnitFromClause(clause: string, fallbackUnit: string): string {
  if (/(?:packet|pkt|पैकेट)/i.test(clause)) return 'पैकेट';
  if (/(?:kilo|kg|किलो)/i.test(clause)) return 'किलो';
  if (/(?:litre|liter|ltr|लीटर)/i.test(clause)) return 'लीटर';
  if (/(?:peti|पेटी|box)/i.test(clause)) return 'पेटी';
  if (/(?:piece|pcs|पीस|नग)/i.test(clause)) return 'पीस';
  return fallbackUnit;
}

/**
 * Deterministic multi-intent parser for Hindi, Hinglish, and Devanagari shopkeeper commands.
 * Used for instant unit testing, offline/demo fallback, and hybrid validation alongside Gemini.
 */
export function parseHindiVoiceCommand(rawInput: string): VoiceParseResult {
  const transcript = rawInput.trim();
  if (!transcript) {
    return {
      transcript: '',
      actions: [],
      needs_clarification: true,
      clarification_question_hi: 'आवाज़ साफ़ नहीं आई। कृपया फिर से बोलिए।',
    };
  }

  // Split compound sentences on "aur", "और", "tatha", ",", "phir", "फिर"
  const rawClauses = transcript
    .split(/\s+(?:aur|और|tatha|तथा|phir|फिर|and)\s+|[,;]+/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const actions: VoiceAction[] = [];
  let lastOrderIntentSeen = false;

  for (const clause of rawClauses) {
    const lower = clause.toLowerCase();

    // 1. Check LIST_PENDING intent
    if (
      /(?:kiska\s+udhaar|kiska\s+baaki|sabka\s+baaki|pending\s+list|कुल\s+बाकी|किसका\s+उधार|किसका\s+बाकी|सबका\s+हिसाब)/i.test(
        clause
      )
    ) {
      actions.push({
        intent: 'LIST_PENDING',
        customer: null,
        amount: null,
        item: null,
        quantity: null,
        unit: null,
        forDate: null,
      });
      lastOrderIntentSeen = false;
      continue;
    }

    // 2. Check QUERY_BALANCE intent
    if (
      /(?:kitna\s+baaki|kitna\s+udhaar|hisaab\s+batao|balance\s+kya|कितना\s+बाकी|कितना\s+उधार|हिसाब\s+बताओ)/i.test(
        clause
      )
    ) {
      const customer = extractCustomerFromClause(clause);
      actions.push({
        intent: 'QUERY_BALANCE',
        customer: customer || 'Ramesh',
        amount: null,
        item: null,
        quantity: null,
        unit: null,
        forDate: null,
      });
      lastOrderIntentSeen = false;
      continue;
    }

    // 3. Check ADD_ORDER_ITEM intent
    const hasOrderKeyword =
      /(?:mangwao|mangwana|mangwa|order|laana|bhejna|मंगवाओ|मंगवाना|ऑर्डर|लाना\s+है|चाहिए)/i.test(
        clause
      );
    const matchedOrderItem = KNOWN_ORDER_ITEMS.find((it) => it.pattern.test(clause));

    const hasCustomerCreditOrPayment =
      /(?:udhaar|udhar|khate|baaki|likho|likh|diye|jama|उधार|खाते|बाकी|लिखो|दिए|जमा)/i.test(
        clause
      ) && extractCustomerFromClause(clause) !== null;

    if (
      (hasOrderKeyword || (matchedOrderItem && !hasCustomerCreditOrPayment) || (lastOrderIntentSeen && matchedOrderItem)) &&
      !/(?:udhaar|udhar|उधार)/i.test(clause)
    ) {
      const quantity = extractNumberFromText(clause) ?? 1;
      const itemObj = matchedOrderItem || { item: 'सामान (Item)', defaultUnit: 'पैकेट' };
      const unit = extractUnitFromClause(clause, itemObj.defaultUnit);
      const forDate = /(?:aaj|आज)/i.test(clause) ? 'आज शाम' : 'कल सुबह';

      actions.push({
        intent: 'ADD_ORDER_ITEM',
        customer: null,
        amount: null,
        item: itemObj.item,
        quantity,
        unit,
        forDate,
      });
      lastOrderIntentSeen = true;
      continue;
    }

    // 4. Check RECEIVE_PAYMENT intent
    if (
      /(?:diye|diya|jama|mil\s+gaye|aa\s+gaye|chuka|payment|दिए|दिया|जमा|मिल\s+गए|आ\s+गए|चुका)/i.test(
        clause
      )
    ) {
      const customer = extractCustomerFromClause(clause);
      const amount = extractNumberFromText(clause);

      if (!customer) {
        return {
          transcript,
          actions: [],
          needs_clarification: true,
          clarification_question_hi: `${amount ? amount + ' रुपये ' : ''}किस ग्राहक से मिले हैं? नाम बताइए।`,
        };
      }
      if (!amount) {
        return {
          transcript,
          actions: [],
          needs_clarification: true,
          clarification_question_hi: `${customer} ने कितने रुपये दिए हैं?`,
        };
      }

      actions.push({
        intent: 'RECEIVE_PAYMENT',
        customer,
        amount,
        item: null,
        quantity: null,
        unit: null,
        forDate: null,
      });
      lastOrderIntentSeen = false;
      continue;
    }

    // 5. Check ADD_CREDIT intent (or implicit customer + amount)
    const customer = extractCustomerFromClause(clause);
    const amount = extractNumberFromText(clause);
    const isCreditKeyword = /(?:udhaar|udhar|baaki|khate|likho|likh|उधार|बाकी|खाते|लिखो|लिख)/i.test(
      lower
    );

    if (isCreditKeyword || (customer && amount)) {
      if (!customer && amount) {
        return {
          transcript,
          actions: [],
          needs_clarification: true,
          clarification_question_hi: `${amount} रुपये किसके खाते में लिखने हैं?`,
        };
      }
      if (customer && !amount) {
        return {
          transcript,
          actions: [],
          needs_clarification: true,
          clarification_question_hi: `${customer} के कितने रुपये उधार लिखने हैं?`,
        };
      }
      if (customer && amount) {
        actions.push({
          intent: 'ADD_CREDIT',
          customer,
          amount,
          item: matchedOrderItem ? matchedOrderItem.item : null,
          quantity: null,
          unit: null,
          forDate: null,
        });
        lastOrderIntentSeen = false;
        continue;
      }
    }
  }

  if (actions.length === 0) {
    return {
      transcript,
      actions: [],
      needs_clarification: true,
      clarification_question_hi:
        'समझ नहीं आया। कृपया ऐसे बोलिए: "रमेश के 40 रुपये उधार लिखो" या "कल 20 पैकेट दूध मंगवाओ"।',
    };
  }

  return {
    transcript,
    actions,
    needs_clarification: false,
    clarification_question_hi: '',
  };
}

/**
 * Strip common Hindi/Hinglish honorifics for fuzzy customer matching
 */
export function normalizeCustomerName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(
      /\b(?:bhai|bhaiya|ji|chacha|didi|madam|mistri|wale|wala|auto|भाई|भैया|जी|चाचा|दीदी|मैडम|मिस्त्री|वाले|वाला|ऑटो)\b/gi,
      ''
    )
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CustomerMatchResult {
  status: 'EXACT' | 'AMBIGUOUS' | 'NEW';
  matchedCustomer: Customer | null;
  candidates: Customer[];
}

/**
 * Fuzzy-matches a spoken customer name against existing ledger customers across Roman, Devanagari, and aliases.
 * If multiple customers match (e.g., two "Ramesh" entries), returns AMBIGUOUS so the UI can ask which one.
 */
export function matchCustomerInLedger(
  spokenName: string | null,
  customers: Customer[]
): CustomerMatchResult {
  if (!spokenName || !spokenName.trim()) {
    return { status: 'NEW', matchedCustomer: null, candidates: [] };
  }

  const rawLower = spokenName.trim().toLowerCase();
  const normSpoken = normalizeCustomerName(spokenName);

  // 1. Check exact full name or alias match first
  const exactMatches = customers.filter((c) => {
    const names = [c.name, c.nameHi, ...c.aliases].map((n) => n.toLowerCase().trim());
    return names.includes(rawLower);
  });

  if (exactMatches.length === 1) {
    return { status: 'EXACT', matchedCustomer: exactMatches[0], candidates: exactMatches };
  }
  if (exactMatches.length > 1) {
    return { status: 'AMBIGUOUS', matchedCustomer: null, candidates: exactMatches };
  }

  // 2. Check normalized name / prefix / substring match
  const fuzzyMatches = customers.filter((c) => {
    const allForms = [c.name, c.nameHi, ...c.aliases];
    return allForms.some((form) => {
      const normForm = normalizeCustomerName(form);
      if (!normForm || !normSpoken) return false;
      return (
        normForm === normSpoken ||
        normForm.startsWith(normSpoken) ||
        normSpoken.startsWith(normForm)
      );
    });
  });

  if (fuzzyMatches.length === 1) {
    return { status: 'EXACT', matchedCustomer: fuzzyMatches[0], candidates: fuzzyMatches };
  }
  if (fuzzyMatches.length > 1) {
    return { status: 'AMBIGUOUS', matchedCustomer: null, candidates: fuzzyMatches };
  }

  return { status: 'NEW', matchedCustomer: null, candidates: [] };
}

/**
 * Checks whether any action exceeds the ₹5,000 safety threshold
 */
export function requiresExtraSafetyConfirmation(actions: VoiceAction[]): boolean {
  return actions.some((a) => typeof a.amount === 'number' && a.amount > SAFETY_THRESHOLD_INR);
}

/**
 * Generates the spoken Hindi confirmation text for SpeechSynthesis ("hi-IN")
 */
export function buildConfirmationSpeechHi(
  result: VoiceParseResult,
  customers: Customer[]
): string {
  if (result.needs_clarification) {
    return result.clarification_question_hi || 'कृपया फिर से बोलिए।';
  }

  const parts: string[] = [];
  for (const action of result.actions) {
    const match = matchCustomerInLedger(action.customer, customers);
    const displayNameHi = match.matchedCustomer?.nameHi || action.customer || 'ग्राहक';

    if (action.intent === 'ADD_CREDIT') {
      parts.push(`${displayNameHi} के ${action.amount} रुपये उधार`);
    } else if (action.intent === 'RECEIVE_PAYMENT') {
      parts.push(`${displayNameHi} से ${action.amount} रुपये जमा मिले`);
    } else if (action.intent === 'ADD_ORDER_ITEM') {
      parts.push(
        `${action.forDate || 'कल सुबह'} के लिए ${action.quantity || 1} ${action.unit || 'पैकेट'} ${action.item || 'सामान'} का ऑर्डर`
      );
    } else if (action.intent === 'QUERY_BALANCE') {
      if (match.matchedCustomer) {
        parts.push(
          `${displayNameHi} का कुल बाकी ${match.matchedCustomer.balance} रुपये है`
        );
      } else {
        parts.push(`${displayNameHi} का खाता देखा जा रहा है`);
      }
    } else if (action.intent === 'LIST_PENDING') {
      const pending = [...customers]
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 3);
      if (pending.length === 0) {
        parts.push('आज किसी का उधार बाकी नहीं है');
      } else {
        const summary = pending.map((c) => `${c.nameHi} पर ${c.balance} रुपये`).join(', ');
        parts.push(`सबसे ज़्यादा बाकी: ${summary}`);
      }
    }
  }

  const isQueryOnly = result.actions.every(
    (a) => a.intent === 'QUERY_BALANCE' || a.intent === 'LIST_PENDING'
  );
  if (isQueryOnly) {
    return parts.join('। ') + '।';
  }

  const highValueWarning = requiresExtraSafetyConfirmation(result.actions)
    ? ' ध्यान दें, यह 5000 रुपये से बड़ी रकम है।'
    : '';

  return `${parts.join(', और ')}।${highValueWarning} क्या यह सही है? हाँ या नहीं बोलें।`;
}

/**
 * Generates standard UPI deep link:
 * upi://pay?pa={upi}&pn={shop}&am={balance}&cu=INR&tn=ChaiKhata
 */
export function buildUpiDeepLink(params: {
  upiId: string;
  shopName: string;
  amount: number;
  note?: string;
}): string {
  const pa = encodeURIComponent(params.upiId.trim());
  const pn = encodeURIComponent(params.shopName.trim());
  const am = Number(params.amount).toFixed(2).replace(/\.00$/, '');
  const tn = encodeURIComponent(params.note || 'ChaiKhata');
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

/**
 * Generates polite Hindi WhatsApp payment reminder message and wa.me URL
 */
export function buildWhatsAppReminder(params: {
  customerNameHi: string;
  phone: string;
  amount: number;
  shopName: string;
  upiId: string;
}): { messageHi: string; upiLink: string; whatsappUrl: string } {
  const upiLink = buildUpiDeepLink({
    upiId: params.upiId,
    shopName: params.shopName,
    amount: params.amount,
    note: 'ChaiKhata',
  });

  const messageHi =
    `नमस्ते ${params.customerNameHi} जी 🙏,\n` +
    `${params.shopName} पर आपका आज तक का हिसाब *₹${params.amount}* बाकी है।\n` +
    `जब सुविधा हो, कृपया नीचे दिए गए UPI लिंक से पेमेंट कर दें:\n` +
    `${upiLink}\n` +
    `धन्यवाद! ☕`;

  const digits = params.phone.replace(/\D/g, '');
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageHi)}`;

  return { messageHi, upiLink, whatsappUrl };
}

/**
 * Generates polite Hindi WhatsApp supplier order message and wa.me URL
 */
export function buildSupplierOrderWhatsApp(params: {
  supplierName: string;
  supplierPhone: string;
  shopName: string;
  items: OrderItem[];
}): { messageHi: string; whatsappUrl: string } {
  const pendingItems = params.items.filter((i) => i.status === 'PENDING');
  const lines = pendingItems.map(
    (item, idx) => `${idx + 1}. ${item.itemHi || item.item} — *${item.quantity} ${item.unit}* (${item.forDate})`
  );

  const messageHi =
    `नमस्ते ${params.supplierName} जी 🙏,\n` +
    `*${params.shopName}* के लिए कल सुबह का ऑर्डर:\n\n` +
    `${lines.join('\n')}\n\n` +
    `कृपया समय पर भिजवा दें। धन्यवाद!`;

  const digits = params.supplierPhone.replace(/\D/g, '');
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageHi)}`;

  return { messageHi, whatsappUrl };
}
