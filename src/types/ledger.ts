export type VoiceIntent =
  | 'ADD_CREDIT'
  | 'RECEIVE_PAYMENT'
  | 'ADD_ORDER_ITEM'
  | 'QUERY_BALANCE'
  | 'LIST_PENDING';

export interface VoiceAction {
  intent: VoiceIntent;
  customer: string | null;
  amount: number | null;
  item: string | null;
  quantity: number | null;
  unit: string | null;
  forDate: string | null;
}

export interface VoiceParseResult {
  transcript: string;
  actions: VoiceAction[];
  needs_clarification: boolean;
  clarification_question_hi: string;
}

export interface Customer {
  id: string;
  name: string;
  nameHi: string;
  aliases: string[];
  phone: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'CREDIT' | 'PAYMENT';
  amount: number;
  note: string;
  createdAt: number;
  status: 'SAVED' | 'PENDING_SYNC';
}

export interface OrderItem {
  id: string;
  item: string;
  itemHi: string;
  quantity: number;
  unit: string;
  forDate: string;
  status: 'PENDING' | 'SENT';
  createdAt: number;
}

export interface OfflineVoiceQueueItem {
  id: string;
  audioBase64?: string;
  mimeType?: string;
  transcriptHint?: string;
  createdAt: number;
  status: 'QUEUED' | 'PROCESSING' | 'FAILED';
}

export interface AppSettings {
  id: string;
  shopName: string;
  ownerUpiId: string;
  supplierName: string;
  supplierPhone: string;
  language: 'hi' | 'en';
}

export interface SampleVoiceCommand {
  id: string;
  category: 'credit' | 'payment' | 'order' | 'multi' | 'query';
  textHi: string;
  textHinglish: string;
  meaningEn: string;
  expectedSummaryHi: string;
}
