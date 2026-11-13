# Google AI Studio Prompt (paste into Build mode)

Copy everything inside the block below.

```
Build a mobile-first Progressive Web App called "ChaiKhata" — a Hindi voice-powered ledger and order assistant for small shopkeepers like chaiwalas and kirana owners in India. Users are low-literacy, busy, with wet hands, on cheap Android phones. They must never need to type.

## CORE IDEA
One giant mic button on the home screen. The shopkeeper speaks in Hindi/Hinglish (e.g., "Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao"). The app sends the audio to the Gemini API, gets structured JSON, shows a confirmation card, speaks it back in Hindi, and on "Haan" saves it to a local database.

## TECH
- React + TypeScript + Tailwind CSS, mobile-first, installable PWA.
- Gemini API (use the Gemini audio input with a JSON response schema) to turn recorded audio into structured actions. Handle noisy audio and Hindi, Hinglish, and English.
- Record audio with MediaRecorder (tap to start, tap to stop, with a visible animated waveform/timer).
- Storage: IndexedDB (use Dexie) — offline-first.
- Voice output: browser SpeechSynthesis with lang "hi-IN".
- No backend required. Keep the Gemini API key in an environment variable and note in the README that production use needs a proxy.

## AI JSON SCHEMA (Gemini must return exactly this)
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
Support multiple actions in one sentence. Convert Hindi number words ("chalis" = 40, "sau" = 100) into numbers. Write a clear system prompt for Gemini with 10+ Hindi/Hinglish few-shot examples. If unsure, set needs_clarification=true and ask a short Hindi question.

## SCREENS (bottom tab bar with big icons + short Hindi labels)
1. Home (बोलो): giant mic button centered, a line of hint text "बोलिए: 'रमेश के 40 रुपये उधार लिखो'", today's summary chips (उधार दिया ₹X, मिला ₹Y, कुल बाकी ₹Z).
2. Confirmation sheet (appears after processing): large cards per action, e.g. "रमेश — ₹40 उधार" and "कल का ऑर्डर — 20 पैकेट दूध". Two huge buttons: "हाँ ✅" and "नहीं ❌". Also listen for the voice reply "haan/nahi". Speak the summary aloud in Hindi with SpeechSynthesis before listening.
3. Khata / बाकी: list of customers with running balance (red if they owe), search, tap to see history. Each row has a "रिमाइंडर भेजो" button.
4. Order / कल का ऑर्डर: list of pending items; button "सप्लायर को भेजो" opens a WhatsApp wa.me link with a Hindi message listing items.
5. Settings: shop name, owner UPI ID, supplier WhatsApp number, language toggle (Hindi/English).

## FEATURES
- Customer matching: fuzzy-match names across Roman/Devanagari spellings and aliases ("Ramesh", "रमेश", "Ramesh bhai"). If ambiguous, ask which customer.
- RECEIVE_PAYMENT reduces balance; QUERY_BALANCE answers aloud; LIST_PENDING shows and reads out top pending customers.
- Payment reminder: generate a UPI deep link upi://pay?pa={upi}&pn={shop}&am={balance}&cu=INR&tn=ChaiKhata and open a WhatsApp wa.me link with a polite Hindi message (never threatening) containing the amount and UPI link. Provide a "Copy link" fallback.
- Undo button for the last saved entry (toast for 10 seconds). Edit/delete on any entry.
- Safety: always confirm before saving; extra confirmation for amounts above ₹5,000; the app never moves money, it only creates links.
- Offline: if the network is down, store the audio blob in a queue, show banner "नेट नहीं है, बाद में सेव होगा", and process the queue automatically when back online. Also provide a manual fallback quick-entry (customer chips + number pad) in case voice fails.
- Daily summary button that reads the day's totals aloud.
- Loading and error states in simple Hindi with icons. Never show technical errors to the user.

## UX RULES (very important)
- A first-time user must succeed within 10 seconds without instructions.
- Minimum tap target 56px, base font 18px+, high contrast, warm chai-inspired palette (amber/brown/cream) with large emoji/icons.
- Almost no text on the main screen; Hindi first, English toggle.
- Haptic feedback (navigator.vibrate) on save.
- Seed the app with demo data (5 customers, a few transactions, a pending order) so judges see a working app immediately, with a "Reset demo data" option in Settings.

## DELIVERABLES
- Clean working code, a README with setup steps, architecture notes, and an honest "limitations" section.
- Include a /docs section or screen showing 10 sample Hindi voice commands users can try.

Build the full working app now, start with the mic → Gemini → confirmation → save flow, then add the remaining screens.
```

## Tips for using it
1. In AI Studio, open **Build** mode, paste the prompt, then run it.
2. Test with real Hindi audio in a noisy room, and fix failures by adding more few-shot examples to the system prompt.
3. After the first build, iterate one feature at a time with short prompts. Examples:
   - "Add the offline queue."
   - "Make the confirmation buttons bigger."
   - "Add Bengali language support."
4. Push the code to GitHub (mandatory), then record the 2–3 minute demo for the +15 bonus points.
