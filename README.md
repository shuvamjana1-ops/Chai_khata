# ☕ ChaiKhata (चाय खाता) — बोलो और लिखो
**Hindi Voice-Powered Ledger (Udhaar Khata) & Supplier Order Assistant for Small Shopkeepers**

ChaiKhata is a mobile-first Progressive Web App (PWA) designed for Indian chaiwalas, kirana store owners, and dairy vendors who work 14-hour days with busy, wet hands on budget Android phones. Instead of unlocking a phone and typing in English, the shopkeeper presses **one giant mic button**, speaks naturally in Hindi or Hinglish (e.g., *"Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao"*), listens to the Hindi spoken confirmation, and taps or says **"हाँ ✅"** to save both the credit entry and tomorrow's supplier order.

---

## ✨ Key Features

1. **Multi-Intent Hindi & Hinglish Voice Capture (`ADD_CREDIT`, `RECEIVE_PAYMENT`, `ADD_ORDER_ITEM`, `QUERY_BALANCE`, `LIST_PENDING`)**
   - Converts Hindi number words (*"chalis"* = 40, *"sau"* = 100, *"dedh sau"* = 150, *"dhai sau"* = 250, *"paanch hazaar"* = 5000) into numbers.
   - Handles compound sentences (e.g., recording customer credit + adding a supplier order item in one breath).
2. **Mandatory Spoken Confirmation & Safety Guardrails**
   - Every parsed command is displayed on large, high-contrast cards and read aloud in Hindi (`SpeechSynthesis` with `hi-IN`).
   - Listens for voice confirmation (*"हाँ"* / *"नहीं"*) or huge 64px touch buttons.
   - Amounts above **₹5,000** trigger an extra mandatory safety confirmation checkbox.
   - **10-Second Undo Toast** after every save, plus full Edit & Delete on every ledger entry.
3. **Digital Khata (बाकी) with Fuzzy Name Matching**
   - Matches customer names across Devanagari, Roman Hinglish, and honorific aliases (`"Ramesh"`, `"रमेश"`, `"Ramesh bhai"`).
   - Prompts the shopkeeper to disambiguate when two customers share a similar name.
4. **Polite UPI + WhatsApp Payment Reminders**
   - Generates a standard UPI deep link (`upi://pay?pa={upi}&pn={shop}&am={balance}&cu=INR&tn=ChaiKhata`) embedded inside a polite, non-threatening Hindi WhatsApp message (`https://wa.me/...`), with 1-tap copy fallback.
5. **Tomorrow Morning Supplier Order (`कल का ऑर्डर`)**
   - Accumulates items (`20 पैकेट दूध`, `5 किलो चीनी`, `2 किलो चाय पत्ती`) and drafts a clean WhatsApp message for the supplier upon owner approval.
6. **Offline-First IndexedDB (Dexie) + Offline Audio Queue + Manual Keypad Fallback**
   - All ledger data lives locally in IndexedDB.
   - If the internet is down, voice commands are queued locally (`"नेट नहीं है, बाद में सेव होगा"`) and processed automatically when connectivity returns.
   - Includes a big calculator-style Manual Quick-Entry keypad for noisy street environments.

---

## 🏗️ System Architecture & Production Proxy Note

```
Mic (MediaRecorder + SpeechRecognition)
   │
   ▼
Express Server Proxy (/api/gemini/parse-voice)
   ├── Primary: Google GenAI SDK (@google/genai, gemini-4-hydrogen) with strict JSON responseSchema & 12 Hindi few-shot examples
   └── Resilient Fallback: Deterministic Hindi/Hinglish multi-intent parser (src/utils/voiceParser.ts)
   │
   ▼
Confirmation Sheet + Hindi SpeechSynthesis (hi-IN) + >₹5,000 Safety Gate
   │
   ▼
IndexedDB (Dexie: customers, transactions, orderItems, offlineQueue, settings)
   │
   ▼
UPI Deep Links (upi://pay) & WhatsApp Links (https://wa.me/)
```

> **Production Security Note:** The `GEMINI_API_KEY` is kept strictly on the server side (`server.ts`) and is never exposed to browser client bundles.

---

## ⚠️ Honest Limitations (v1)

- **Extreme Street Noise:** Very loud traffic horns or mixer grinders can degrade microphone capture; we mitigate this with mandatory read-back confirmation before saving and a 1-tap Manual Keypad fallback.
- **No Automatic Bank Settlement:** By design, ChaiKhata never touches or moves bank money directly. It only generates standard `upi://pay` deep links that open in the customer's own UPI app (GPay, PhonePe, Paytm, BHIM).
- **Single-Device Local Storage:** Data is persisted in IndexedDB on the shopkeeper's phone for instant offline reliability; multi-device cloud sync is planned for v2.

---

## 🚀 Setup & Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   Copy `.env.example` to `.env` and set your `GEMINI_API_KEY`:
   ```bash
   GEMINI_API_KEY="your_gemini_api_key"
   ```
3. **Run unit tests:**
   ```bash
   npx --yes tsx --test src/utils/voiceParser.test.ts
   ```
4. **Start the full-stack development server (Port 3000):**
   ```bash
   npm run dev
   ```
