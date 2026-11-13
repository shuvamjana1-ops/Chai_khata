# PRD: ChaiKhata — Hindi Voice Ledger & Order Assistant for Small Shopkeepers

**Hackathon:** VibeX Codes | **Track:** 1 (Daily Workers, Small Shopkeepers & Office Workers)
**Version:** 1.0

---

## 1. Problem
Chaiwalas, kirana owners and food-stall vendors work 14 hours a day with wet, busy hands. They cannot stop, unlock a phone and type English to record *udhaar* (credit) or note what to order for tomorrow. Result: forgotten credit, lost money, daily stress.

## 2. Vision
"Speak once, everything is done." A shopkeeper presses one big mic button (or says a command), speaks in Hindi/Hinglish, and the app records the credit, prepares the payment reminder and drafts the supplier order, with zero typing.

## 3. Target Users
| User | Need |
|---|---|
| Primary: Chaiwala / kirana / stall owner (low-literacy, Hindi-speaking, cheap Android phone) | Record credit and orders hands-free |
| Secondary: Customer (Ramesh) | Gets a polite UPI payment link on WhatsApp |
| Secondary: Supplier (milk vendor) | Gets a clear order message |

## 4. Goals & Success Metrics
- Record a credit entry in **under 10 seconds** (one tap + one sentence).
- Voice-command accuracy of at least 90% on 20 test Hindi/Hinglish phrases (name, amount, item, quantity).
- Zero silent mistakes: every entry is read back aloud and confirmed before saving.
- Works with weak internet (offline queue).

## 5. Non-Goals (v1)
Full accounting/GST, inventory management, real payment processing (we only generate UPI deep links), multi-shop support.

## 6. Core Features (MVP)

### F1. Voice Command Capture (P0)
- Large push-to-talk mic button (hold or tap to record); works in noisy environments.
- Audio is sent to Gemini, which returns structured JSON (intent + entities).
- Supported intents:
  - `ADD_CREDIT` — "Ramesh ke naam 40 rupaye udhaar likho"
  - `RECEIVE_PAYMENT` — "Ramesh ne 100 rupaye diye"
  - `ADD_ORDER_ITEM` — "Kal subah 20 packet doodh mangwao"
  - `QUERY_BALANCE` — "Ramesh ka kitna baaki hai?"
  - `LIST_PENDING` — "Aaj kiska udhaar baaki hai?"
- Multiple intents in one sentence must be handled (example: credit + order).

### F2. Confirm Before Save (P0)
- App speaks back (Hindi TTS) and shows a large card: "Ramesh — ₹40 udhaar. Sahi hai?" with big **Haan ✅ / Nahi ❌** buttons (also voice "haan"/"nahi").
- Undo for the last entry.

### F3. Digital Khata (Ledger) (P0)
- Customer list with running balance, last entry date, and entry history.
- Stored in IndexedDB (offline-first); optional Firebase sync (P2).
- Fuzzy name matching ("Ramesh", "Ramesh bhai", "रमेश") maps to the same customer; ask when ambiguous.

### F4. Payment Reminder via UPI + WhatsApp (P0)
- Button "Reminder bhejo" generates:
  - UPI deep link: `upi://pay?pa=<shop_upi>&pn=<shop_name>&am=<amount>&cu=INR&tn=Chai khata`
  - WhatsApp link `https://wa.me/<phone>?text=<polite Hindi message + UPI link>`
- Tone is polite and non-threatening. The message is in Hindi.
- Evening auto-reminder suggestion list ("Aaj in 3 logo ko reminder bhejein?").

### F5. Supplier Order Draft (P0)
- Order items accumulate in a "Kal ka order" list.
- One tap sends a WhatsApp message to the supplier: "20 packet doodh, 5 kg cheeni — kal subah 6 baje".
- Ordering is never automatic without owner approval (safety).

### F6. Daily Summary (P1)
- Spoken + visual summary: today's credit given, payments received, total pending, top 3 pending customers.

### F7. Hindi / Hinglish UI with Icons (P0)
- Minimal text, large icons, high contrast, large tap targets (min 56px).
- Language toggle: Hindi, English (Bengali/Marathi as stretch).

### F8. Offline & Noise Resilience (P1)
- If offline: record audio, queue it, process when internet returns; show a clear "Net nahi hai, baad mein save hoga" banner.
- Fallback manual quick-entry (number pad + customer chips) if voice fails.

## 7. User Flows

**Flow A: Credit entry**
1. Open app (mic screen is the home screen).
2. Tap mic, say: "Ramesh ke 40 rupaye udhaar likho aur kal 20 packet doodh mangwana."
3. App shows two cards: Credit ₹40 for Ramesh; Order: 20 packet doodh.
4. App speaks: "Ramesh, 40 rupaye udhaar. 20 packet doodh kal ke liye. Sahi hai?"
5. Owner says "haan" → saved. Balance updates.

**Flow B: Evening reminder**
1. Owner opens "Baaki" tab → sees pending list.
2. Taps "Reminder" on Ramesh → WhatsApp opens with prefilled Hindi message + UPI link.

## 8. System Architecture
- **Frontend:** React + Tailwind PWA (mobile-first, installable, works offline).
- **AI:** Gemini API (audio input, structured JSON output via response schema).
- **Voice out:** Browser SpeechSynthesis (`hi-IN`).
- **Storage:** IndexedDB (Dexie) for ledger, orders, settings; optional Firebase.
- **Integrations:** UPI deep links, WhatsApp `wa.me` links (no paid APIs needed).

```
Mic -> Audio blob -> Gemini (audio -> JSON intents) -> Validation layer
   -> Confirmation UI + TTS -> IndexedDB ledger -> UPI/WhatsApp links
```

## 9. Data Model
- **Customer:** id, name, aliases[], phone, balance, createdAt
- **Transaction:** id, customerId, type (CREDIT|PAYMENT), amount, note, createdAt, status
- **OrderItem:** id, item, quantity, unit, forDate, status (PENDING|SENT)
- **Settings:** shopName, ownerUpiId, supplierPhone, language

## 10. AI Output Schema (example)
```json
{
  "transcript": "Ramesh ke 40 rupaye udhaar likho aur kal 20 packet doodh mangwao",
  "actions": [
    {"intent": "ADD_CREDIT", "customer": "Ramesh", "amount": 40},
    {"intent": "ADD_ORDER_ITEM", "item": "doodh", "quantity": 20, "unit": "packet", "forDate": "tomorrow"}
  ],
  "needs_clarification": false,
  "clarification_question_hi": ""
}
```

## 11. Safety, Privacy & Reliability
- Mandatory confirmation before any save; amounts read back aloud.
- Suspiciously large amounts (e.g., above ₹5,000) trigger an extra confirmation.
- No payment is ever moved by the app; UPI links are opened by the customer's own app.
- Data stays on the device by default; API key kept out of client code in production (proxy), noted in the PPT.
- Customers' phone numbers are used only to open WhatsApp links.
- Edit/delete/undo for every entry.

## 12. Non-Functional Requirements
- First meaningful screen under 2 seconds on a low-end phone.
- Voice round-trip under 4 seconds on 4G.
- Contrast ratio of at least 4.5:1; font size 18px or above.
- Runs on Chrome Android; installable as PWA.

## 13. Mapping to Judging Criteria
| Criterion | How ChaiKhata scores |
|---|---|
| Real-world usefulness (25) | Solves the exact udhaar and ordering pain of millions of shopkeepers |
| Tech works (25) | Real DB, multi-intent voice parsing, UPI/WhatsApp integration, offline queue |
| Simplicity (20) | One mic button, spoken confirmation, Hindi icons |
| Speed/safety/readiness (15) | Confirm-before-save, undo, offline mode, no money handled by the app |
| PPT (15) | 8–10 honest slides with live links |
| Video bonus (+15) | Demo: speak in Hindi, watch the ledger update, open WhatsApp reminder |

## 14. Milestones
1. Hours 0–4: Mic capture + Gemini JSON parsing + confirmation UI
2. Hours 4–10: Ledger DB + customer matching + balance views
3. Hours 10–16: UPI/WhatsApp reminders + order draft
4. Hours 16–20: Offline queue, TTS, noise testing with real Hindi samples
5. Hours 20–24: PPT (8–10 slides), GitHub README, 2–3 min video demo

## 15. PPT Outline (8–10 slides)
1. Title & team
2. Problem (chaiwala story)
3. Solution overview
4. Live flow (screenshots: speak → confirm → saved)
5. Architecture
6. Tech stack
7. Why it's easy (10-second test)
8. Safety, offline and limits (be honest)
9. Impact and future (Bengali/Marathi, Hindi earphone mode, UPI auto-match)
10. GitHub + demo + video links

## 16. Future Scope
Regional languages, wake-word hands-free mode, auto-matching received UPI payments, stock prediction from order history, Labor-Bridge integration for hiring helpers.
