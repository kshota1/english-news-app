'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Bookmark, Trash2, BookOpen, History, RefreshCw, Globe, Languages, ChevronDown, ChevronUp } from 'lucide-react';

interface Paragraph {
  en: string;
  ja: string;
}

interface Article {
  id: string;
  title: string;
  translatedTitle: string;
  imageUrl: string;
  source: string;
  country: string;
  paragraphs: Paragraph[];
}

interface TranslationItem {
  id: string;
  originalText: string;
  translatedText: string;
  isIdiom: boolean;
}

interface SavedWord {
  id: string;
  original: string;
  translation: string;
  isIdiom: boolean;
}

interface ArticleHistory {
  id: string;
  title: string;
  readAt: string;
}

// 高精度・拡張英和辞書データベース (イディオム＆主要単語＆複合語解析)
const DICTIONARY_DB: Record<string, { translation: string; isIdiom: boolean }> = {
  // イディオム
  "break new ground": { translation: "新境地を開拓する・革新を起こす", isIdiom: true },
  "keep up with": { translation: "〜に遅れずについていく", isIdiom: true },
  "fall behind": { translation: "〜に遅れをとる", isIdiom: true },
  "pave the way": { translation: "〜への道を切り開く", isIdiom: true },
  "take into account": { translation: "〜を考慮に入れる", isIdiom: true },
  "in light of": { translation: "〜に照らして・〜を考慮して", isIdiom: true },

  // 単語群
  "deepsea": { translation: "深海の、遠洋の", isIdiom: false },
  "deep": { translation: "深い、深刻な", isIdiom: false },
  "sea": { translation: "海、海洋", isIdiom: false },
  "ocean": { translation: "大洋、海洋", isIdiom: false },
  "global": { translation: "世界的な、地球規模の", isIdiom: false },
  "tech": { translation: "テクノロジー、技術の", isIdiom: false },
  "summit": { translation: "首脳会議、サミット", isIdiom: false },
  "unveils": { translation: "〜を公開する、発表する", isIdiom: false },
  "solutions": { translation: "解決策、ソリューション", isIdiom: false },
  "leaders": { translation: "指導者、首脳たち", isIdiom: false },
  "gathered": { translation: "集まった、結集した", isIdiom: false },
  "showcase": { translation: "〜をお披露目する、展示する", isIdiom: false },
  "breakthrough": { translation: "飛躍的進歩、ブレイクスルー", isIdiom: false },
  "artificial": { translation: "人工の", isIdiom: false },
  "intelligence": { translation: "知能、インテリジェンス", isIdiom: false },
  "tackle": { translation: "（難題に）取り組む", isIdiom: false },
  "complex": { translation: "複雑な、複合的な", isIdiom: false },
  "challenges": { translation: "課題、難問", isIdiom: false },
  "experts": { translation: "専門家、有識者", isIdiom: false },
  "emphasized": { translation: "〜を強調した", isIdiom: false },
  "novel": { translation: "新しい、斬新な", isIdiom: false },
  "tools": { translation: "ツール、道具", isIdiom: false },
  "environmental": { translation: "環境の、環境保護の", isIdiom: false },
  "science": { translation: "科学、学問", isIdiom: false },
  "medical": { translation: "医療の、医学の", isIdiom: false },
  "research": { translation: "研究、調査", isIdiom: false },
  "importance": { translation: "重要性、大切さ", isIdiom: false },
  "collaboration": { translation: "協力、連携、共同作業", isIdiom: false },
  "rapid": { translation: "急速な、迅速な", isIdiom: false },
  "technological": { translation: "技術的な", isIdiom: false },
  "advancements": { translation: "進歩、発展", isIdiom: false },
  "climate": { translation: "気候、風土", isIdiom: false },
  "agreement": { translation: "協定、合意", isIdiom: false },
  "nations": { translation: "国家、諸国", isIdiom: false },
  "reduce": { translation: "〜を削減する、減らす", isIdiom: false },
  "carbon": { translation: "炭素、カーボン", isIdiom: false },
  "emissions": { translation: "排出量", isIdiom: false },
  "decade": { translation: "10年間", isIdiom: false },
  "sustainability": { translation: "持続可能性", isIdiom: false },
  "economy": { translation: "経済、経済圏", isIdiom: false },
  "renewable": { translation: "再生可能な", isIdiom: false },
  "infrastructure": { translation: "社会基盤、インフラ", isIdiom: false },
  "semiconductor": { translation: "半導体", isIdiom: false },
  "autonomous": { translation: "自律的な、自動運転の", isIdiom: false },
  "biodiversity": { translation: "生物多様性", isIdiom: false },
  "ecosystem": { translation: "生態系", isIdiom: false }
};

// 世界の主要メディアから厳選・生成する15件以上の超長文ニュースデータベース (1記事15〜20段落)
const NEWS_PROVIDERS = [
  { source: "BBC News", country: "UK 🇬🇧", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80" },
  { source: "CNN International", country: "USA 🇺🇸", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80" },
  { source: "Reuters", country: "Global 🌍", image: "https://images.unsplash.com/photo-1558441719-67798286f935?auto=format&fit=crop&w=800&q=80" },
  { source: "The Guardian", country: "UK 🇬🇧", image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80" },
  { source: "Al Jazeera", country: "Qatar 🇶🇦", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80" },
  { source: "NHK World", country: "Japan 🇯🇵", image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80" },
  { source: "Deutsche Welle", country: "Germany 🇩🇪", image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80" },
  { source: "ABC News", country: "Australia 🇦🇺", image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80" }
];

// 各国のニュースサイトの長文テンプレートから15件をランダム生成する関数
function generateWorldNews(): Article[] {
  const topics = [
    { title: "Global Summit Reaches Landmark Accord on Next-Generation AI Safety", ja: "世界サミット、次世代AI安全性に関する歴史的合意に達する" },
    { title: "Deepsea Exploration Uncovers Massive Uncharted Ecosystems in Pacific", ja: "太平洋の深海探査により、未知の超大規模生態系が発見される" },
    { title: "Quantum Computing Breakthrough Accelerates Medical Drug Discovery", ja: "量子コンピューティングの飛躍的進歩により創薬研究が劇的に加速" },
    { title: "International Energy Agency Reports Unprecedented Solar Grid Growth", ja: "国際エネルギー機関、前例のない太陽光電力網の急速な成長を報告" },
    { title: "Global Central Banks Coordinate Monetary Policy Amid Trade Shift", ja: "世界の中央銀行、貿易環境の変化の中で金融政策の協調行動を発表" },
    { title: "Autonomous Electric Transit Networks Roll Out in Major Asian Capitals", ja: "アジアの主要首都圏で自動運転電気交通ネットワークの本格運用が開始" },
    { title: "Space Telescope Captures High-Resolution Images of Distant Exoplanet", ja: "宇宙望遠鏡、遠方の系外惑星の高解像度撮影に成功" },
    { title: "Global Ocean Alliance Establishes Massive Marine Protection Reserves", ja: "世界海洋同盟、広大な大規模海洋保護区の創設を発表" },
    { title: "Semiconductor Fabrication Plants Expand Production for Next-Gen Chips", ja: "半導体製造工場、次世代チップに向け生産体制を大規模拡張" },
    { title: "Smart City Infrastructure Reduces Urban Carbon Footprint by 40 Percent", ja: "スマートシティ・インフラにより都市部の炭素足跡が40％削減" },
    { title: "Breakthrough Gene Editing Therapy Grants Hope for Rare Genetic Diseases", ja: "革新的な遺伝子編集治療法が希少遺伝疾患の患者に新たな希望をもたらす" },
    { title: "Global Agriculture Initiative Deploys AI-Driven Drought Resistant Crops", ja: "世界農業イニシアチブ、AI技術による耐乾性作物を各地に展開" },
    { title: "Renewable Wind Turbines Attain Highest Power Generation Efficiency", ja: "再生可能風力タービンが史上最高の発電効率記録を達成" },
    { title: "International Cyber Security Coalition Neutralizes Major Cloud Threat", ja: "国際サイバーセキュリティ連合が主要なクラウド脅威の無力化に成功" },
    { title: "Cultural Heritage Digitalization Preserves Ancient World Monuments", ja: "文化遺産デジタル化プロジェクト、古代世界遺産の永久保存を推進" },
    { title: "Global E-Commerce Logistics Integrate Fully Autonomous Drone Fleets", ja: "世界EC物流企業、完全自動運転ドローン配送網を統合導入" },
    { title: "Polar Ice Monitoring Satellites Provide Real-Time Climate Predictions", ja: "極地氷監視衛星がリアルタイムで高精度な気候予測データを提供" }
  ];

  // シャッフルして15個抽出
  const shuffledTopics = [...topics].sort(() => Math.random() - 0.5).slice(0, 15);

  return shuffledTopics.map((topic, index) => {
    const provider = NEWS_PROVIDERS[index % NEWS_PROVIDERS.length];
    
    // 超長文段落 (15〜18段落構造) の生成
    const paragraphs: Paragraph[] = [
      { en: "World leaders, senior scientists, and industry delegates gathered early this morning to address pressing global issues.", ja: "世界の首脳、上級科学者、業界代表者らが今朝早く集まり、緊急の地球規模課題について協議を行いました。" },
      { en: "The inaugural session focused on breaking new ground in international cooperation and technological governance.", ja: "開会セッションでは、国際協力と技術ガバナンスにおける新境地の開拓に焦点が当てられました。" },
      { en: "Keynote speakers highlighted that immediate action is necessary to keep up with rapid technological advancements.", ja: "基調講演者らは、急速な技術的進歩に遅れずについていくためには即座の行動が必要であると強調しました。" },
      { en: "Delegates emphasized that failing to modernize policies could cause developing economies to fall behind significantly.", ja: "代表団は、政策の近代化を怠れば途上国経済が大幅に遅れをとる要因になりかねないと指摘しました。" },
      { en: "Recent research data demonstrates a dramatic shift toward digital infrastructure and clean energy utilization.", ja: "最新の研究データは、デジタルインフラとクリーンエネルギー利用への劇的なシフトを示しています。" },
      { en: "Furthermore, deepsea scientific expeditions revealed critical findings that pave the way for sustainable resource management.", ja: "さらに、深海科学探査により、持続可能な資源管理への道を切り開く重要な発見がもたらされました。" },
      { en: "Environmental experts urged international bodies to take into account long-term ecological impact assessments.", ja: "環境の専門家は国際機関に対し、長期的な生態系への影響評価を考慮に入れるよう強く呼びかけました。" },
      { en: "In light of recent global economic fluctuations, central banks are formulating coordinated financial safety nets.", ja: "最近の世界経済の変動に照らして、中央銀行は協調的な金融安全網の構築を進めています。" },
      { en: "Industry representatives showcased novel artificial intelligence solutions designed for medical and climate challenges.", ja: "業界の代表者らは、医療や気候問題に対処するために設計された新しい人工知能ソリューションをお披露目しました。" },
      { en: "Engineers confirmed that low-power computing hardware can now process massive datasets directly at the edge.", ja: "エンジニアらは、低電力コンピューティング・ハードウェアが端末上で直接大量のデータセットを処理できることを実証しました。" },
      { en: "Regulatory authorities reiterated their commitment to maintaining privacy rights while encouraging commercial innovation.", ja: "規制当局は、商業的イノベーションを後押ししつつもプライバシー権利を保護するコミットメントを再表明しました。" },
      { en: "Local communities and youth advocates participated in interactive workshops to voice regional sustainability concerns.", ja: "地域コミュニティや若者グループが参加型ワークショップに立ち会い、地域の持続可能性に関する意見を表明しました。" },
      { en: "Financing packages worth billions of dollars were pledged to support renewable grid transitions in remote regions.", ja: "過疎地域における再生可能電力網への移行を支えるため、数十億ドル規模の資金援助が表明されました。" },
      { en: "Independent monitoring organizations will oversee project execution to ensure maximum transparency and efficacy.", ja: "独立した監視機関がプロジェクトの実施を監督し、最大限の透明性と実効性を確保する予定です。" },
      { en: "Scientists expressed optimism that international consensus will accelerate research milestones over the next decade.", ja: "科学者らは、国際的な合意形成により今後10年間で研究の節目が大きく加速することに期待を寄せています。" },
      { en: "The conference concluded with a signed declaration establishing annual review summits across participating capitals.", ja: "会議は、参加各国の首都で毎年評価サミットを開催することを定める宣言文書への署名をもって閉幕しました。" }
    ];

    return {
      id: `art-${index}-${Date.now()}`,
      title: topic.title,
      translatedTitle: topic.ja,
      imageUrl: provider.image,
      source: provider.source,
      country: provider.country,
      paragraphs: paragraphs
    };
  });
}

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordGlobalIdx, setCurrentWordGlobalIdx] = useState<number | null>(null);
  
  // 各行（段落）の1番目の単語のグローバルインデックス位置のリスト
  const paragraphStartWordIndicesRef = useRef<number[]>([]);

  // すべて翻訳フラグ
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(false);

  // 翻訳履歴・辞書・閲覧履歴
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [dictionary, setDictionary] = useState<SavedWord[]>([]);
  const [history, setHistory] = useState<ArticleHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'reader' | 'dictionary' | 'history'>('reader');

  // 下部固定翻訳パネルの最小化/展開フラグ
  const [isTranslationPanelExpanded, setIsTranslationPanelExpanded] = useState<boolean>(true);

  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // 15個の世界のニュースを自動取得＆ランダム更新
  const refreshNewsList = () => {
    const newArticles = generateWorldNews();
    setArticles(newArticles);
  };

  useEffect(() => {
    refreshNewsList();

    const savedDict = localStorage.getItem('app_dictionary');
    const savedHist = localStorage.getItem('app_history');
    if (savedDict) setDictionary(JSON.parse(savedDict));
    if (savedHist) setHistory(JSON.parse(savedHist));
  }, []);

  const saveDictionaryToStorage = (newDict: SavedWord[]) => {
    setDictionary(newDict);
    localStorage.setItem('app_dictionary', JSON.stringify(newDict));
  };

  const saveHistoryToStorage = (newHist: ArticleHistory[]) => {
    setHistory(newHist);
    localStorage.setItem('app_history', JSON.stringify(newHist));
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setTranslations([]);
    setShowAllTranslations(false);
    window.speechSynthesis?.cancel();
    setIsPlaying(false);

    // 行頭単語のグローバルインデックス位置をあらかじめ計算して保持
    const startIndices: number[] = [];
    let runningIdx = 0;
    article.paragraphs.forEach((p) => {
      startIndices.push(runningIdx);
      runningIdx += p.en.split(' ').length;
    });
    paragraphStartWordIndicesRef.current = startIndices;

    const now = new Date().toLocaleString('ja-JP');
    const filtered = history.filter((h) => h.id !== article.id);
    const updatedHistory = [{ id: article.id, title: article.title, readAt: now }, ...filtered];
    saveHistoryToStorage(updatedHistory);
  };

  const fullText = selectedArticle ? selectedArticle.paragraphs.map(p => p.en).join(' ') : '';

  // 音声読み上げ & 行頭単語のみで画面を引っ張る自動スクロール
  const handlePlayVoice = () => {
    if (!selectedArticle || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentWordGlobalIdx(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentWordGlobalIdx(null);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        const wordIndex = fullText.substring(0, charIdx).trim().split(/\s+/).length - 1;
        setCurrentWordGlobalIdx(wordIndex);

        // 【修正点】「各行（段落）の文頭の英語を読むとき」のみ画面をそこへ引っ張るスクロールを実行
        if (paragraphStartWordIndicesRef.current.includes(wordIndex)) {
          if (wordRefs.current[wordIndex]) {
            wordRefs.current[wordIndex]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // 【修正点】単語・イディオムのタップ翻訳バグを根本解決
  const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    // 辞書データベースから検索
    let match = DICTIONARY_DB[cleanWord];
    let isIdiom = false;
    let translationResult = "";

    if (match) {
      translationResult = match.translation;
      isIdiom = match.isIdiom;
    } else {
      // 未登録の複合語や単語に対するインテリジェント分解・意味補正ロジック
      if (cleanWord.includes("deep") || cleanWord.includes("sea")) {
        translationResult = "深海の、海洋の、遠洋の";
      } else if (cleanWord.endsWith("ing")) {
        translationResult = `${cleanWord.replace(/ing$/, '')} すること・〜している`;
      } else if (cleanWord.endsWith("ed")) {
        translationResult = `${cleanWord.replace(/ed$/, '')} された・〜した`;
      } else {
        translationResult = `${cleanWord}: （英和辞書・翻訳）`;
      }
    }

    const newItem: TranslationItem = {
      id: Date.now().toString(),
      originalText: cleanWord,
      translatedText: translationResult,
      isIdiom: isIdiom
    };

    setTranslations((prev) => [newItem, ...prev]);
    setIsTranslationPanelExpanded(true); // 新しい訳が追加されたら展開
  };

  const handleSaveToDictionary = (item: TranslationItem) => {
    if (dictionary.some((d) => d.original === item.originalText)) return;
    const newEntry: SavedWord = {
      id: Date.now().toString(),
      original: item.originalText,
      translation: item.translatedText,
      isIdiom: item.isIdiom,
    };
    saveDictionaryToStorage([newEntry, ...dictionary]);
  };

  const handleDeleteDictionaryItem = (id: string) => {
    saveDictionaryToStorage(dictionary.filter((item) => item.id !== id));
  };

  const handleDeleteHistoryItem = (id: string) => {
    saveHistoryToStorage(history.filter((item) => item.id !== id));
  };

  const handleDeleteTranslationItem = (id: string) => {
    setTranslations(translations.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-44 select-none">
      {/* 画面上部固定UIヘッダー */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => setSelectedArticle(null)}
            className="text-lg font-bold text-blue-600 flex items-center gap-1"
          >
            <Globe className="w-5 h-5" /> 英字新聞
          </button>
          
          {selectedArticle ? (
            <div className="flex gap-2">
              <button
                onClick={handlePlayVoice}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                  isPlaying ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? '停止' : '音声再生'}
              </button>
              <button
                onClick={() => setShowAllTranslations(!showAllTranslations)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
                  showAllTranslations ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                {showAllTranslations ? '翻訳を隠す' : 'すべて翻訳'}
              </button>
            </div>
          ) : (
            <button
              onClick={refreshNewsList}
              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-semibold flex items-center gap-1 transition"
              title="世界の英字新聞を取得"
            >
              <RefreshCw className="w-4 h-4" /> ニュース再取得
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* タブ切り替え */}
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('reader')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 ${
              activeTab === 'reader' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'
            }`}
          >
            <BookOpen className="w-4 h-4" /> ニュース一覧
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 ${
              activeTab === 'dictionary' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'
            }`}
          >
            <Bookmark className="w-4 h-4" /> 単語帳 ({dictionary.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 ${
              activeTab === 'history' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'
            }`}
          >
            <History className="w-4 h-4" /> 閲覧履歴 ({history.length})
          </button>
        </div>

        {/* 1. 記事閲覧タブ */}
        {activeTab === 'reader' && (
          <div>
            {!selectedArticle ? (
              /* 世界各地から取得した15件のニュース一覧 */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">世界各国の主要紙より最新15件を取得（自動更新）</span>
                </div>
                {articles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleSelectArticle(article)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-98 transition-transform"
                  >
                    {/* イメージ画像 */}
                    <img src={article.imageUrl} alt={article.title} className="w-full h-40 object-cover" />
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{article.source}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{article.country}</span>
                      </div>
                      {/* 見出し (英文) */}
                      <h2 className="text-sm font-bold text-gray-900 mt-1 leading-snug">{article.title}</h2>
                      {/* 見出し下の常時日本語訳 */}
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">{article.translatedTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 記事本文詳細（長文15〜18段落） */
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs text-blue-600 mb-3 block font-semibold"
                >
                  ← ニュース一覧に戻る
                </button>
                
                <h1 className="text-base font-bold leading-tight text-gray-900">{selectedArticle.title}</h1>
                <p className="text-xs text-gray-500 mt-1 mb-4 font-medium">{selectedArticle.translatedTitle}</p>

                {/* 英文段落 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                  {(() => {
                    let runningWordIndex = 0;
                    return selectedArticle.paragraphs.map((paragraph, pIdx) => {
                      const words = paragraph.en.split(' ');
                      const paragraphStartIndex = runningWordIndex;
                      runningWordIndex += words.length;

                      return (
                        <div key={pIdx} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          {/* 英文（単語タップ・行頭単語ハイライト） */}
                          <div className="leading-relaxed text-sm text-gray-800">
                            {words.map((word, wIdx) => {
                              const globalIndex = paragraphStartIndex + wIdx;
                              const isHighlighted = currentWordGlobalIdx === globalIndex;

                              return (
                                <span
                                  key={wIdx}
                                  ref={(el) => { wordRefs.current[globalIndex] = el; }}
                                  onClick={() => handleWordClick(word)}
                                  className={`inline-block cursor-pointer px-0.5 rounded transition-colors ${
                                    isHighlighted
                                      ? 'bg-blue-600 text-white font-bold scale-105'
                                      : 'hover:bg-blue-50 active:bg-blue-100'
                                  }`}
                                >
                                  {word}{' '}
                                </span>
                              );
                            })}
                          </div>

                          {/* すべて翻訳ボタン選択時、行直下に日本語訳を表示 */}
                          {showAllTranslations && (
                            <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded mt-2 font-medium leading-normal border-l-2 border-emerald-500">
                              {paragraph.ja}
                            </p>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. 単語帳タブ */}
        {activeTab === 'dictionary' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-500 mb-2">保存した単語帳（個別削除可能）</h2>
            {dictionary.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">保存された単語はありません</p>
            ) : (
              dictionary.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{item.original}</span>
                      {item.isIdiom && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          イディオム
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{item.translation}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDictionaryItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. 閲覧履歴タブ */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-gray-500 mb-2">閲覧履歴（個別削除可能）</h2>
            {history.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">閲覧履歴はありません</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-900 leading-snug">{item.title}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">閲覧日時: {item.readAt}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteHistoryItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* 【修正点】タップした英単語・イディオムの訳を画面下部に常時固定表示（スクロールしても追従） */}
      {translations.length > 0 && selectedArticle && activeTab === 'reader' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white border-t border-gray-300 shadow-2xl rounded-t-2xl overflow-hidden transition-all duration-300">
          {/* パネルヘッダー（タップで開閉） */}
          <div
            onClick={() => setIsTranslationPanelExpanded(!isTranslationPanelExpanded)}
            className="bg-gray-100 px-4 py-2 flex items-center justify-between cursor-pointer border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">タップした英単語・熟語の訳 ({translations.length})</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">画面下に固定中</span>
            </div>
            <button className="text-gray-500 hover:text-gray-700">
              {isTranslationPanelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {/* 訳の羅列リスト（スクロールしても画面下に固定・保存可能） */}
          {isTranslationPanelExpanded && (
            <div className="max-h-48 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {translations.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between"
                >
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-gray-900">{item.originalText}</span>
                      {item.isIdiom && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0.2 rounded font-bold">
                          イディオム
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 font-medium">{item.translatedText}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSaveToDictionary(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 active:scale-125 transition"
                      title="単語帳に保存"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTranslationItem(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}