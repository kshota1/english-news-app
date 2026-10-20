import { NextResponse } from 'next/server';

// イディオム＆標準英和辞書データベース（完全無料・高精度対応）
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

    const lowerSentence = sentence ? sentence.toLowerCase() : '';
    let isIdiom = false;
    let idiomPhrase = '';
    let translatedText = '';

    // 文脈に基づくイディオム判定
    for (const key of Object.keys(FALLBACK_DICTIONARY)) {
      if (key.includes(' ') && key.includes(cleanWord) && lowerSentence.includes(key)) {
        isIdiom = true;
        idiomPhrase = key;
        translatedText = FALLBACK_DICTIONARY[key];
        break;
      }
    }

    // 単語単体の場合の日本語訳取得
    if (!isIdiom) {
      if (FALLBACK_DICTIONARY[cleanWord]) {
        translatedText = FALLBACK_DICTIONARY[cleanWord];
      } else {
        // 無料の外部翻訳API (MyMemory) を利用
        try {
          const apiRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|ja`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            const text = data.responseData?.translatedText;
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