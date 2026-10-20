import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Vercelの環境変数 OPENAI_API_KEY が設定されている場合はOpenAIを使用
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// イディオム＆標準英和辞書データベース（APIフォールバック用）
const FALLBACK_DICTIONARY: Record<string, string> = {
  "clear": "明確な、晴れた / 〜を片付ける、明らかにする",
  "clear up": "（疑問・天候・病気などが）解消する、晴れ渡る",
  "scientists": "科学者たち、研究者",
  "pave the way": "〜への道を切り開く",
  "break new ground": "新境地を開拓する",
  "keep up with": "〜に遅れずについていく",
  "fall behind": "〜に遅れをとる",
  "take into account": "〜を考慮に入れる",
  "in light of": "〜に照らして・〜を考慮して",
};

export async function POST(req: Request) {
  try {
    const { word, sentence } = await req.json();
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();

    // 1. OpenAI APIが利用可能な場合、AIによる文脈イディオム判定＆高精度翻訳
    if (openai) {
      const prompt = `
英文文脈: "${sentence}"
タップされた単語: "${word}"

指示:
1. タップされた単語 "${word}" が、前後の単語と組み合わさってイディオム（熟語・慣用句・句動詞）として機能しているか文脈から判断してください。
2. イディオムである場合は isIdiom を true にし、その熟語フレーズ (idiomPhrase) と、文脈に合った正確な日本語訳 (translatedText) を返してください。
3. イディオムでない場合は isIdiom を false とし、その単語の文脈に合った自然な日本語訳 (translatedText) を返してください。英単語そのものを絶対に返さず、必ず日本語に翻訳してください。

出力フォーマット（JSONのみ）:
{
  "isIdiom": boolean,
  "idiomPhrase": "イディオムフレーズ（イディオムでなければ空文字）",
  "translatedText": "日本語訳"
}
`;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return NextResponse.json(result);
    }

    // 2. OpenAI API未設定時の多層フォールバック処理（バグ回避・ルールベース判定）
    const lowerSentence = sentence.toLowerCase();
    let isIdiom = false;
    let idiomPhrase = '';
    let translatedText = '';

    // イディオム判定
    for (const key of Object.keys(FALLBACK_DICTIONARY)) {
      if (key.includes(' ') && key.includes(cleanWord) && lowerSentence.includes(key)) {
        isIdiom = true;
        idiomPhrase = key;
        translatedText = FALLBACK_DICTIONARY[key];
        break;
      }
    }

    // 単語単体の場合
    if (!isIdiom) {
      if (FALLBACK_DICTIONARY[cleanWord]) {
        translatedText = FALLBACK_DICTIONARY[cleanWord];
      } else {
        // MyMemory API等によるバックアップ翻訳
        try {
          const apiRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|ja`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            const text = data.responseData?.translatedText;
            // 「clear ➔ clear」のように英単語のまま返された場合は除外
            if (text && text.toLowerCase() !== cleanWord && !text.includes('MYMEMORY')) {
              translatedText = text;
            }
          }
        } catch (e) {}

        if (!translatedText) {
          translatedText = `${cleanWord}（名詞・動詞）`;
        }
      }
    }

    return NextResponse.json({
      isIdiom,
      idiomPhrase,
      translatedText,
    });
  } catch (error) {
    return NextResponse.json({ isIdiom: false, translatedText: '翻訳エラーが発生しました' }, { status: 500 });
  }
}