import Dexie, { type Table } from 'dexie';
import {
  AppSettings,
  Customer,
  OfflineVoiceQueueItem,
  OrderItem,
  Transaction,
} from '../types/ledger';

export class ChaiKhataDatabase extends Dexie {
  customers!: Table<Customer, string>;
  transactions!: Table<Transaction, string>;
  orderItems!: Table<OrderItem, string>;
  offlineQueue!: Table<OfflineVoiceQueueItem, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ChaiKhataLedgerDB');
    this.version(1).stores({
      customers: 'id, name, nameHi, balance, updatedAt',
      transactions: 'id, customerId, type, createdAt, status',
      orderItems: 'id, status, forDate, createdAt',
      offlineQueue: 'id, status, createdAt',
      settings: 'id',
    });
  }
}

export const db = new ChaiKhataDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  shopName: 'शर्मा चाय एवं किराना (Sharma Chai)',
  ownerUpiId: 'sharmachai@okaxis',
  supplierName: 'अमूल डेयरी सप्लायर (Amul Dairy)',
  supplierPhone: '9811122233',
  language: 'hi',
};

export function getSeedData() {
  const now = Date.now();
  const oneHour = 3600 * 1000;

  const customers: Customer[] = [
    {
      id: 'cust-ramesh',
      name: 'Ramesh',
      nameHi: 'रमेश',
      aliases: ['Ramesh', 'रमेश', 'Ramesh bhai', 'रमेश भाई', 'Ramesh ji'],
      phone: '9876543210',
      balance: 240,
      createdAt: now - 7 * 24 * oneHour,
      updatedAt: now - 1 * oneHour,
    },
    {
      id: 'cust-suresh',
      name: 'Suresh',
      nameHi: 'सुरेश भाई',
      aliases: ['Suresh', 'सुरेश', 'Suresh bhai', 'सुरेश भाई'],
      phone: '9876543211',
      balance: 420,
      createdAt: now - 6 * 24 * oneHour,
      updatedAt: now - 2 * oneHour,
    },
    {
      id: 'cust-munna',
      name: 'Munna Auto',
      nameHi: 'मुन्ना ऑटो',
      aliases: ['Munna', 'Munna Auto', 'मुन्ना', 'मुन्ना ऑटो', 'Munna auto wala'],
      phone: '9876543212',
      balance: 150,
      createdAt: now - 5 * 24 * oneHour,
      updatedAt: now - 3 * oneHour,
    },
    {
      id: 'cust-priya',
      name: 'Priya Madam',
      nameHi: 'प्रिया मैडम',
      aliases: ['Priya', 'Priya Madam', 'प्रिया', 'प्रिया मैडम', 'Priya didi'],
      phone: '9876543213',
      balance: 310,
      createdAt: now - 4 * 24 * oneHour,
      updatedAt: now - 4 * oneHour,
    },
    {
      id: 'cust-raju',
      name: 'Raju Mistri',
      nameHi: 'राजू मिस्त्री',
      aliases: ['Raju', 'Raju Mistri', 'राजू', 'राजू मिस्त्री', 'Raju bhai'],
      phone: '9876543214',
      balance: 0,
      createdAt: now - 3 * 24 * oneHour,
      updatedAt: now - 5 * oneHour,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      customerId: 'cust-ramesh',
      customerName: 'रमेश',
      type: 'CREDIT',
      amount: 140,
      note: 'चाय और मस्का बन (सुबह)',
      createdAt: now - 5 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-2',
      customerId: 'cust-ramesh',
      customerName: 'रमेश',
      type: 'CREDIT',
      amount: 100,
      note: 'दूध और बिस्कुट पैकेट',
      createdAt: now - 2 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-3',
      customerId: 'cust-suresh',
      customerName: 'सुरेश भाई',
      type: 'CREDIT',
      amount: 520,
      note: 'किराना सामान व चाय पत्ती',
      createdAt: now - 4 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-4',
      customerId: 'cust-suresh',
      customerName: 'सुरेश भाई',
      type: 'PAYMENT',
      amount: 100,
      note: 'नकद जमा किए',
      createdAt: now - 2.5 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-5',
      customerId: 'cust-munna',
      customerName: 'मुन्ना ऑटो',
      type: 'CREDIT',
      amount: 150,
      note: 'चाय-समोसा (स्टैंड)',
      createdAt: now - 3 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-6',
      customerId: 'cust-priya',
      customerName: 'प्रिया मैडम',
      type: 'CREDIT',
      amount: 310,
      note: 'ब्रेड, मक्खन और दूध',
      createdAt: now - 3.5 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-7',
      customerId: 'cust-raju',
      customerName: 'राजू मिस्त्री',
      type: 'CREDIT',
      amount: 80,
      note: '4 कप स्पेशल चाय और बिस्कुट',
      createdAt: now - 6 * oneHour,
      status: 'SAVED',
    },
    {
      id: 'tx-8',
      customerId: 'cust-raju',
      customerName: 'राजू मिस्त्री',
      type: 'PAYMENT',
      amount: 80,
      note: 'पूरा हिसाब चुकता',
      createdAt: now - 1.5 * oneHour,
      status: 'SAVED',
    },
  ];

  const orderItems: OrderItem[] = [
    {
      id: 'ord-1',
      item: 'दूध (Doodh)',
      itemHi: 'दूध (फुल क्रीम)',
      quantity: 20,
      unit: 'पैकेट',
      forDate: 'कल सुबह',
      status: 'PENDING',
      createdAt: now - 2 * oneHour,
    },
    {
      id: 'ord-2',
      item: 'चीनी (Cheeni)',
      itemHi: 'चीनी (शक्कर)',
      quantity: 5,
      unit: 'किलो',
      forDate: 'कल सुबह',
      status: 'PENDING',
      createdAt: now - 1.8 * oneHour,
    },
    {
      id: 'ord-3',
      item: 'चाय पत्ती (Chai Patti)',
      itemHi: 'असम कड़क चाय पत्ती',
      quantity: 2,
      unit: 'किलो',
      forDate: 'कल सुबह',
      status: 'PENDING',
      createdAt: now - 1.2 * oneHour,
    },
  ];

  return { customers, transactions, orderItems };
}

export async function ensureSeedData(): Promise<void> {
  const existingSettings = await db.settings.get('default');
  if (!existingSettings) {
    await db.settings.put(DEFAULT_SETTINGS);
  }

  const count = await db.customers.count();
  if (count === 0) {
    const { customers, transactions, orderItems } = getSeedData();
    await db.transaction('rw', db.customers, db.transactions, db.orderItems, async () => {
      await db.customers.bulkPut(customers);
      await db.transactions.bulkPut(transactions);
      await db.orderItems.bulkPut(orderItems);
    });
  }
}

export async function resetAllDemoData(): Promise<void> {
  const { customers, transactions, orderItems } = getSeedData();
  await db.transaction(
    'rw',
    [db.customers, db.transactions, db.orderItems, db.offlineQueue, db.settings],
    async () => {
      await db.customers.clear();
      await db.transactions.clear();
      await db.orderItems.clear();
      await db.offlineQueue.clear();
      await db.settings.put(DEFAULT_SETTINGS);
      await db.customers.bulkPut(customers);
      await db.transactions.bulkPut(transactions);
      await db.orderItems.bulkPut(orderItems);
    }
  );
}
