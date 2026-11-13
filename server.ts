import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  GEMINI_VOICE_SYSTEM_PROMPT,
  parseHindiVoiceCommand,
} from './src/utils/voiceParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VOICE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description: 'Transcribed Hindi or Hinglish text spoken by the shopkeeper.',
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          intent: {
            type: Type.STRING,
            description:
              'One of: ADD_CREDIT, RECEIVE_PAYMENT, ADD_ORDER_ITEM, QUERY_BALANCE, LIST_PENDING',
          },
          customer: {
            type: Type.STRING,
            nullable: true,
            description: 'Customer name if applicable, or null.',
          },
          amount: {
            type: Type.NUMBER,
            nullable: true,
            description: 'Amount in INR (numeric) if applicable, or null.',
          },
          item: {
            type: Type.STRING,
            nullable: true,
            description: 'Item name for orders or credit notes, or null.',
          },
          quantity: {
            type: Type.NUMBER,
            nullable: true,
            description: 'Numeric quantity for order items, or null.',
          },
          unit: {
            type: Type.STRING,
            nullable: true,
            description: 'Unit such as पैकेट, किलो, लीटर, पीस, पेटी, or null.',
          },
          forDate: {
            type: Type.STRING,
            nullable: true,
            description: 'Delivery time/date such as कल सुबह or आज शाम, or null.',
          },
        },
        required: ['intent', 'customer', 'amount', 'item', 'quantity', 'unit', 'forDate'],
      },
    },
    needs_clarification: {
      type: Type.BOOLEAN,
      description: 'True if customer name or amount is missing or unclear.',
    },
    clarification_question_hi: {
      type: Type.STRING,
      description: 'Short, polite Hindi question asking for the missing detail.',
    },
  },
  required: ['transcript', 'actions', 'needs_clarification', 'clarification_question_hi'],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({ status: 'ok', geminiConfigured: hasGeminiKey });
  });

  app.post('/api/gemini/parse-voice', async (req, res) => {
    try {
      const { audioBase64, mimeType, transcriptHint, knownCustomers } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        transcriptHint?: string;
        knownCustomers?: string[];
      };

      // Fast deterministic path when transcriptHint is provided without raw audio bytes
      if (!audioBase64 && transcriptHint && transcriptHint.trim()) {
        const localParsed = parseHindiVoiceCommand(transcriptHint);
        if (!localParsed.needs_clarification && localParsed.actions.length > 0) {
          res.json({ ...localParsed, source: 'local-parser' });
          return;
        }
      }

      const ai = getGeminiClient();

      if (ai && (audioBase64 || transcriptHint)) {
        try {
          const customerContext =
            Array.isArray(knownCustomers) && knownCustomers.length > 0
              ? `\nKnown shop customers: ${knownCustomers.join(', ')}. Match against these names if phonetically close.`
              : '';

          const parts: Array<
            | { inlineData: { mimeType: string; data: string } }
            | { text: string }
          > = [];

          if (audioBase64) {
            parts.push({
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            });
          }

          parts.push({
            text: transcriptHint
              ? `Shopkeeper spoke: "${transcriptHint}". Parse this Hindi/Hinglish voice command into the exact JSON schema.${customerContext}`
              : `Listen to this Hindi/Hinglish shopkeeper audio recording and extract all ledger and supplier order actions into the exact JSON schema.${customerContext}`,
          });

          const response = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: { parts },
              config: {
                systemInstruction: GEMINI_VOICE_SYSTEM_PROMPT,
                responseMimeType: 'application/json',
                responseSchema: VOICE_RESPONSE_SCHEMA,
                thinkingConfig: {
                  thinkingLevel: ThinkingLevel.LOW,
                },
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Gemini timeout')), 12000)
            ),
          ]);

          const rawText = (response.text ?? '').trim();
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed && Array.isArray(parsed.actions)) {
              res.json({ ...parsed, source: 'gemini' });
              return;
            }
          }
        } catch {
          // Silently fall back to deterministic Hindi parser without stderr warning noise
        }
      }

      if (transcriptHint && transcriptHint.trim()) {
        const localParsed = parseHindiVoiceCommand(transcriptHint);
        res.json({ ...localParsed, source: 'local-parser' });
        return;
      }

      res.json({
        transcript: '',
        actions: [],
        needs_clarification: true,
        clarification_question_hi:
          'आवाज़ साफ़ नहीं आई। कृपया माइक के पास बोलिए: "रमेश के 40 रुपये उधार लिखो"।',
        source: 'fallback',
      });
    } catch {
      res.status(200).json({
        transcript: '',
        actions: [],
        needs_clarification: true,
        clarification_question_hi:
          'अभी आवाज़ प्रोसेस नहीं हो पाई। कृपया दोबारा बोलें।',
        source: 'fallback',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      if (req.url && req.url.startsWith('/@vite/client')) {
        try {
          const result = await vite.transformRequest(req.url);
          if (result && result.code) {
            const patched = result.code
              .replace(
                /new WebSocket\(/g,
                'new (function(){ var t = new EventTarget(); t.readyState = 1; t.OPEN = 1; t.send = function(){}; t.close = function(){}; setTimeout(function(){ if (typeof t.onopen === "function") t.onopen(new Event("open")); t.dispatchEvent(new Event("open")); }, 0); return t; })('
              )
              .replace(
                /reject\((?:\/\* @__PURE__ \*\/ )?new Error\("WebSocket closed without opened\."\)\)/g,
                'resolve()'
              );
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).end(patched);
            return;
          }
        } catch {
          // Fall through to default vite middleware
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChaiKhata server running on http://localhost:${PORT}`);
  });
}

startServer();
