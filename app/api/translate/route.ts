import { NextResponse } from 'next/server';

// 主要イディオム・熟語データベース
const IDIOMS_DB: Record<string, string> = {
  "pave the way": "〜への道を切り開く",
  "break new ground": "新境地を開拓する",
  "keep up with": "〜に遅れずについていく",
  "fall behind": "〜に遅れをとる",
  "take into account": "〜を考慮に入れる",
  "in light of": "〜に照らして・〜を考慮して",
  "clear up": "（問題・天候が）晴れる・解明する",
  "bring about": "〜をもたらす",
  "carry out": "〜を実行する",
  "point out": "〜を指摘する",
  "set up": "〜を設立する・準備する",
  "turn out": "〜であることが判明する",
};

// Google翻訳エンジンによる高精度英和翻訳処理
async function fetchGoogleTranslate(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map((item: any) => item[0]).join('');
        if (translated && translated.trim().toLowerCase() !== text.trim().toLowerCase()) {
          return translated.trim();
        }
      }
    }
  } catch (e) {
    console.error('Google Translate error:', e);
  }
  return '';
}

export async function POST(req: Request) {
  try {
    const { word, sentence } = await req.json();
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();

    if (!cleanWord) {
      return NextResponse.json({ isIdiom: false, translatedText: '' });
    }

    const lowerSentence = sentence ? sentence.toLowerCase() : '';
    let isIdiom = false;
    let idiomPhrase = '';
    let translatedText = '';

    // 1. 文章全体の文脈からイディオム（熟語）を検出
    for (const phrase of Object.keys(IDIOMS_DB)) {
      if (phrase.includes(cleanWord) && lowerSentence.includes(phrase)) {
        isIdiom = true;
        idiomPhrase = phrase;
        translatedText = IDIOMS_DB[phrase];
        break;
      }
    }

    // 2. イディオムでない場合、Google高精度翻訳を実行
    if (!isIdiom) {
      translatedText = await fetchGoogleTranslate(cleanWord);

      // 単語そのままや不十分な訳の場合、語幹（-ed / -ing / -s 除外）でフォールバック解析
      if (!translatedText) {
        const stemWord = cleanWord.replace(/(ed|ing|s|es)$/, '');
        if (stemWord && stemWord !== cleanWord) {
          const stemTrans = await fetchGoogleTranslate(stemWord);
          if (stemTrans) {
            if (cleanWord.endsWith('ed')) {
              translatedText = `${stemTrans}（活用された・過去形）`;
            } else if (cleanWord.endsWith('ing')) {
              translatedText = `${stemTrans}（進行中・現在分詞）`;
            } else {
              translatedText = stemTrans;
            }
          }
        }
      }
    }

    // 3. 英語のまま残るのを防止する安全装置
    if (!translatedText || translatedText.toLowerCase() === cleanWord) {
      translatedText = `${cleanWord}（訳語）`;
    }

    return NextResponse.json({
      isIdiom,
      idiomPhrase,
      translatedText,
    });
  } catch (error) {
    return NextResponse.json({ isIdiom: false, translatedText: '翻訳処理エラー' }, { status: 500 });
  }
}