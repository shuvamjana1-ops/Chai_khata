import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractNumberFromText,
  parseHindiVoiceCommand,
  matchCustomerInLedger,
  requiresExtraSafetyConfirmation,
  buildUpiDeepLink,
  buildWhatsAppReminder,
  buildSupplierOrderWhatsApp,
} from './voiceParser';
import { Customer, OrderItem } from '../types/ledger';

const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Ramesh',
    nameHi: 'रमेश',
    aliases: ['Ramesh', 'रमेश', 'Ramesh bhai', 'रमेश भाई'],
    phone: '9876543210',
    balance: 240,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'c2',
    name: 'Suresh',
    nameHi: 'सुरेश भाई',
    aliases: ['Suresh', 'सुरेश', 'Suresh bhai'],
    phone: '9876543211',
    balance: 180,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

test('extractNumberFromText converts Hindi/Hinglish words and Devanagari digits to numbers', () => {
  assert.equal(extractNumberFromText('chalis rupaye'), 40);
  assert.equal(extractNumberFromText('sau rupaye'), 100);
  assert.equal(extractNumberFromText('dedh sau rupaye'), 150);
  assert.equal(extractNumberFromText('dhai sau rupaye'), 250);
  assert.equal(extractNumberFromText('paanch hazaar'), 5000);
  assert.equal(extractNumberFromText('चालीस रुपये'), 40);
  assert.equal(extractNumberFromText('डेढ़ सौ रुपये'), 150);
  assert.equal(extractNumberFromText('₹४० उधार'), 40);
});

test('parseHindiVoiceCommand handles multi-intent credit + supplier order sentence', () => {
  const result = parseHindiVoiceCommand(
    'Ramesh ke 40 rupaye udhaar likho aur kal subah 20 packet doodh mangwao'
  );
  assert.equal(result.needs_clarification, false);
  assert.equal(result.actions.length, 2);

  assert.equal(result.actions[0].intent, 'ADD_CREDIT');
  assert.equal(result.actions[0].customer, 'Ramesh');
  assert.equal(result.actions[0].amount, 40);

  assert.equal(result.actions[1].intent, 'ADD_ORDER_ITEM');
  assert.equal(result.actions[1].quantity, 20);
  assert.equal(result.actions[1].unit, 'पैकेट');
  assert.ok(result.actions[1].item?.includes('दूध'));
});

test('parseHindiVoiceCommand handles RECEIVE_PAYMENT and QUERY_BALANCE', () => {
  const payResult = parseHindiVoiceCommand('Ramesh ne sau rupaye diye');
  assert.equal(payResult.needs_clarification, false);
  assert.equal(payResult.actions.length, 1);
  assert.equal(payResult.actions[0].intent, 'RECEIVE_PAYMENT');
  assert.equal(payResult.actions[0].customer, 'Ramesh');
  assert.equal(payResult.actions[0].amount, 100);

  const queryResult = parseHindiVoiceCommand('Ramesh ka kitna baaki hai?');
  assert.equal(queryResult.actions[0].intent, 'QUERY_BALANCE');
  assert.equal(queryResult.actions[0].customer, 'Ramesh');
});

test('parseHindiVoiceCommand requests clarification when amount or customer is missing', () => {
  const missingAmount = parseHindiVoiceCommand('Ramesh ke naam udhaar likho');
  assert.equal(missingAmount.needs_clarification, true);
  assert.ok(missingAmount.clarification_question_hi.includes('कितने रुपये'));

  const missingCustomer = parseHindiVoiceCommand('50 rupaye udhaar likho');
  assert.equal(missingCustomer.needs_clarification, true);
  assert.ok(missingCustomer.clarification_question_hi.includes('किसके'));
});

test('matchCustomerInLedger matches across Roman, Devanagari, and honorific aliases, and detects ambiguity', () => {
  const exactRoman = matchCustomerInLedger('Ramesh bhai', DEMO_CUSTOMERS);
  assert.equal(exactRoman.status, 'EXACT');
  assert.equal(exactRoman.matchedCustomer?.id, 'c1');

  const exactDevanagari = matchCustomerInLedger('रमेश', DEMO_CUSTOMERS);
  assert.equal(exactDevanagari.status, 'EXACT');
  assert.equal(exactDevanagari.matchedCustomer?.id, 'c1');

  // Add second Ramesh to test ambiguity detection
  const ambiguousList: Customer[] = [
    ...DEMO_CUSTOMERS,
    {
      id: 'c3',
      name: 'Ramesh Verma',
      nameHi: 'रमेश वर्मा',
      aliases: ['Ramesh Verma', 'रमेश वर्मा'],
      phone: '9876543299',
      balance: 90,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];
  const ambigMatch = matchCustomerInLedger('Ramesh Ji', ambiguousList);
  assert.equal(ambigMatch.status, 'AMBIGUOUS');
  assert.equal(ambigMatch.candidates.length, 2);
});

test('requiresExtraSafetyConfirmation flags amounts above 5000 INR', () => {
  assert.equal(
    requiresExtraSafetyConfirmation([
      {
        intent: 'ADD_CREDIT',
        customer: 'Suresh',
        amount: 5000,
        item: null,
        quantity: null,
        unit: null,
        forDate: null,
      },
    ]),
    false
  );
  assert.equal(
    requiresExtraSafetyConfirmation([
      {
        intent: 'ADD_CREDIT',
        customer: 'Suresh',
        amount: 6000,
        item: null,
        quantity: null,
        unit: null,
        forDate: null,
      },
    ]),
    true
  );
});

test('buildUpiDeepLink and buildWhatsAppReminder generate valid polite Hindi links', () => {
  const upi = buildUpiDeepLink({
    upiId: 'sharmachai@okaxis',
    shopName: 'Sharma Chai Stall',
    amount: 240,
  });
  assert.equal(
    upi,
    'upi://pay?pa=sharmachai%40okaxis&pn=Sharma%20Chai%20Stall&am=240&cu=INR&tn=ChaiKhata'
  );

  const reminder = buildWhatsAppReminder({
    customerNameHi: 'रमेश',
    phone: '9876543210',
    amount: 240,
    shopName: 'शर्मा चाय स्टॉल',
    upiId: 'sharmachai@okaxis',
  });
  assert.ok(reminder.whatsappUrl.startsWith('https://wa.me/919876543210?text='));
  assert.ok(reminder.messageHi.includes('₹240'));
  assert.ok(reminder.messageHi.includes(reminder.upiLink));

  const orderItems: OrderItem[] = [
    {
      id: 'o1',
      item: 'Doodh',
      itemHi: 'दूध (Doodh)',
      quantity: 20,
      unit: 'पैकेट',
      forDate: 'कल सुबह',
      status: 'PENDING',
      createdAt: Date.now(),
    },
  ];
  const supplierOrder = buildSupplierOrderWhatsApp({
    supplierName: 'अमूल डेयरी',
    supplierPhone: '9811122233',
    shopName: 'शर्मा चाय स्टॉल',
    items: orderItems,
  });
  assert.ok(supplierOrder.whatsappUrl.startsWith('https://wa.me/919811122233?text='));
  assert.ok(supplierOrder.messageHi.includes('20 पैकेट'));
});
