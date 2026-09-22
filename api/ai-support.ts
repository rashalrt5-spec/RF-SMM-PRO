import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(200).end();
    res.statusCode = 200;
    return res.end();
  }

  const sendJson = (status: number, data: any) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(status).json(data);
    }
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { message, userContext } = body;
    const queryText = (message || '').trim();
    const lower = queryText.toLowerCase();

    // Smart Bengali SMM support responses
    if (lower.includes('ডিপোজিট') || lower.includes('টাকা') || lower.includes('ব্যালেন্স') || lower.includes('বিকাশ') || lower.includes('নগদ') || lower.includes('রকেট') || lower.includes('deposit')) {
      return sendJson(200, {
        reply: `💳 **ইনস্ট্যান্ট ডিপোজিট (Add Funds) করার নিয়ম:**\n১. নিচের মেনু থেকে **"Deposit / Add Funds"** অপশনে যান।\n২. মেথড (**বিকাশ / নগদ / রকেট**) সিলেক্ট করুন।\n৩. পার্সোনাল নাম্বারে Send Money করুন।\n৪. Sender Number ও TrxID লিখে সাবমিট করুন।\n⚡ ১ থেকে ৩ মিনিটে ব্যালেন্স যুক্ত হয়ে যাবে!\n💡 বর্তমান ব্যালেন্স: ৳${Number(userContext?.balance || 0).toFixed(2)}`
      });
    }

    if (lower.includes('অর্ডার') || lower.includes('order') || lower.includes('পেন্ডিং') || lower.includes('pending')) {
      return sendJson(200, {
        reply: `🚀 **অর্ডার সংক্রান্ত তথ্য:**\n• আমাদের ৯৫% সার্ভিস **১ থেকে ৫ মিনিটের মধ্যে** স্বয়ংক্রিয়ভাবে শুরু হয়ে যায়।\n• লাইভ স্ট্যাটাস দেখতে নিচের **"Orders"** ট্যাবে ক্লিক করুন।\n• কোনো সহায়তার জন্য WhatsApp: https://wa.me/8801342163841`
      });
    }

    // Try Gemini if API key is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are RF SMM Panel live AI assistant. Reply helpfully in friendly Bengali.\nUser question: ${queryText}`,
        });
        const text = response.text;
        if (text) {
          return sendJson(200, { reply: text });
        }
      } catch (gemErr) {
        console.warn('Gemini call failed:', gemErr);
      }
    }

    return sendJson(200, {
      reply: `👋 আসসালামু আলাইকুম! আমি RF SMM AI লাইভ সাপোর্ট সহকারী। ডিপোজিট, সোশ্যাল মিডিয়া অর্ডার বা ব্যালেন্স সংক্রান্ত যেকোনো তথ্যের জন্য আমাকে মেসেজ দিন বা WhatsApp-এ যোগাযোগ করুন।`
    });
  } catch (err: any) {
    return sendJson(500, { error: err.message });
  }
}
