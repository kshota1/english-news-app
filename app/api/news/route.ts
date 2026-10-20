import { NextResponse } from 'next/server';

// 実際の英字新聞社（BBC、The Guardian、Reuters）のRSSフィード一覧
const FEEDS = [
  { source: 'BBC News', country: 'UK 🇬🇧', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'The Guardian', country: 'UK 🇬🇧', url: 'https://www.theguardian.com/world/rss' },
  { source: 'Reuters', country: 'Global 🌍', url: 'https://www.reutersagency.com/feed/?best-topics=world-news' },
];

export async function GET() {
  try {
    const allArticles: any[] = [];

    for (const feed of FEEDS) {
      try {
        const res = await fetch(feed.url, { next: { revalidate: 3600 } }); // 1時間キャッシュ
        const xmlText = await res.text();

        // RSS XMLから記事アイテムを抽出
        const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

        for (let i = 0; i < Math.min(items.length, 6); i++) {
          const item = items[i];
          const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/)?.[1] || item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
          const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/)?.[1] || item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
          
          // サムネイル画像の抽出
          let imageUrl = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80';
          const mediaMatch = item.match(/url="(https:\/\/[^"]+\.(jpg|png|jpeg))"/i) || item.match(/src="(https:\/\/[^"]+\.(jpg|png|jpeg))"/i);
          if (mediaMatch) {
            imageUrl = mediaMatch[1];
          }

          // HTMLタグの除去処理
          const cleanTitle = title.replace(/<[^>]+>/g, '').trim();
          const cleanDesc = description.replace(/<[^>]+>/g, '').trim();

          if (cleanTitle && cleanDesc) {
            // 長文用段落の生成
            const sentences = cleanDesc.split(/(?<=\.)\s+/);
            const paragraphs = sentences.map((sentence) => ({
              en: sentence,
              ja: '（クリックで翻訳表示）'
            }));

            allArticles.push({
              id: `real-${Date.now()}-${Math.random()}`,
              title: cleanTitle,
              translatedTitle: cleanTitle, // 初回プレースホルダー
              imageUrl: imageUrl,
              source: feed.source,
              country: feed.country,
              paragraphs: paragraphs.length > 0 ? paragraphs : [{ en: cleanDesc, ja: '' }]
            });
          }
        }
      } catch (e) {
        console.error(`Error fetching feed ${feed.source}:`, e);
      }
    }

    // ランダムに15件取得して返却
    const shuffled = allArticles.sort(() => Math.random() - 0.5).slice(0, 15);
    return NextResponse.json(shuffled);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch real news' }, { status: 500 });
  }
}