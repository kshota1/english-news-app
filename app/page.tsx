'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Bookmark, Trash2, BookOpen, History, Volume2, Globe } from 'lucide-react';

// --- 型定義 ---
interface Article {
  id: string;
  title: string;
  translatedTitle: string;
  imageUrl: string;
  source: string;
  content: string[]; // パラグラフ（段落）の配列
}

interface TranslationItem {
  id: string;
  originalText: string;
  translatedText: string;
  isIdiom: boolean;
  idiomDetail?: string;
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

// サンプル記事データ（海外主要メディア想定の5分程度で読める量）
const SAMPLE_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Global Tech Summit Unveils Next-Generation AI Solutions',
    translatedTitle: '世界テックサミット、次世代AIソリューションを発表',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    source: 'Global Tech News',
    content: [
      "Tech leaders from around the world gathered today to showcase breakthrough artificial intelligence systems designed to tackle complex global challenges.",
      "Industry experts emphasized that these novel tools will break new ground in environmental science and medical research.",
      "The event highlighted the importance of global collaboration to keep up with rapid technological advancements."
    ]
  },
  {
    id: '2',
    title: 'Historic Climate Agreement Signed by Over 50 Nations',
    translatedTitle: '50か国以上が歴史的な気候協定に署名',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    source: 'World Daily',
    content: [
      "Delegates reached a milestone consensus to drastically reduce carbon emissions over the coming decade.",
      "Environmentalists praised the agreement, urging participating nations not to fall behind on their ambitious sustainability targets.",
      "Implementation will begin immediately with international support packages for developing economies."
    ]
  }
];

// 簡易イディオム辞書データ（デモ用）
const IDIOM_DICTIONARY: Record<string, { idiom: string; translation: string }> = {
  "break": { idiom: "break new ground", translation: "新境地を開拓する・革新を起こす" },
  "ground": { idiom: "break new ground", translation: "新境地を開拓する・革新を起こす" },
  "keep": { idiom: "keep up with", translation: "〜に遅れずについていく" },
  "fall": { idiom: "fall behind", translation: "〜に遅れをとる" }
};

export default function App() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordGlobalIdx, setCurrentWordGlobalIdx] = useState<number | null>(null);
  
  // 翻訳ストリーム＆履歴・辞書状態
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [dictionary, setDictionary] = useState<SavedWord[]>([]);
  const [history, setHistory] = useState<ArticleHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'reader' | 'dictionary' | 'history'>('reader');

  // 音声制御・要素参照用
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // 初期化時にローカルストレージから保存データを読み込み
  useEffect(() => {
    const savedDict = localStorage.getItem('app_dictionary');
    const savedHist = localStorage.getItem('app_history');
    if (savedDict) setDictionary(JSON.parse(savedDict));
    if (savedHist) setHistory(JSON.parse(savedHist));
  }, []);

  // ローカルストレージ自動更新
  const saveDictionaryToStorage = (newDict: SavedWord[]) => {
    setDictionary(newDict);
    localStorage.setItem('app_dictionary', JSON.stringify(newDict));
  };

  const saveHistoryToStorage = (newHist: ArticleHistory[]) => {
    setHistory(newHist);
    localStorage.setItem('app_history', JSON.stringify(newHist));
  };

  // 記事閲覧時の履歴自動追加
  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    setTranslations([]);
    window.speechSynthesis?.cancel();
    setIsPlaying(false);

    // 履歴へ追加（重複があれば最新日時に更新）
    const now = new Date().toLocaleString('ja-JP');
    const filtered = history.filter((h) => h.id !== article.id);
    const updatedHistory = [{ id: article.id, title: article.title, readAt: now }, ...filtered];
    saveHistoryToStorage(updatedHistory);
  };

  // 単語・全テキスト分割処理
  const allWords = selectedArticle ? selectedArticle.content.join(' ').split(' ') : [];

  // 音声読み上げ & 同期自動スクロール処理
  const handlePlayVoice = () => {
    if (!selectedArticle || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentWordGlobalIdx(null);
      return;
    }

    const fullText = selectedArticle.content.join(' ');
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentWordGlobalIdx(null);
    };

    // 読み上げ中の位置検知と単語ハイライト・自動スクロール
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        // 文字インデックスから該当する単語の配列インデックスを取得
        const wordIndex = fullText.substring(0, charIdx).trim().split(/\s+/).length - 1;
        setCurrentWordGlobalIdx(wordIndex);

        // 対象単語への自動スクロール（iPhone Safariに配慮したスムーススクロール）
        if (wordRefs.current[wordIndex]) {
          wordRefs.current[wordIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // 単語タップ時の翻訳 & イディオム判定処理
  const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    const idiomInfo = IDIOM_DICTIONARY[cleanWord];
    const isIdiom = !!idiomInfo;

    const newItem: TranslationItem = {
      id: Date.now().toString(),
      originalText: isIdiom ? idiomInfo.idiom : cleanWord,
      translatedText: isIdiom ? idiomInfo.translation : `${cleanWord} の意味・翻訳`,
      isIdiom: isIdiom,
      idiomDetail: isIdiom ? `熟語フレーズ: "${idiomInfo.idiom}"` : undefined,
    };

    setTranslations((prev) => [newItem, ...prev]);
  };

  // 全文章一括翻訳
  const handleTranslateAll = () => {
    if (!selectedArticle) return;
    const newItem: TranslationItem = {
      id: Date.now().toString(),
      originalText: '記事全体の一括翻訳',
      translatedText: selectedArticle.translatedTitle + '（全体の詳細日本語訳がここに展開されます）',
      isIdiom: false,
    };
    setTranslations((prev) => [newItem, ...prev]);
  };

  // 辞書追加
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

  // 辞書・履歴の個別削除機能
  const handleDeleteDictionaryItem = (id: string) => {
    saveDictionaryToStorage(dictionary.filter((item) => item.id !== id));
  };

  const handleDeleteHistoryItem = (id: string) => {
    saveHistoryToStorage(history.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 select-none">
      {/* --- 上部固定ヘッダー (スクロールしても固定) --- */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => setSelectedArticle(null)}
            className="text-lg font-bold text-blue-600 flex items-center gap-1"
          >
            <Globe className="w-5 h-5" /> 英字新聞
          </button>
          
          {selectedArticle && (
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
                onClick={handleTranslateAll}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-semibold"
              >
                すべて翻訳
              </button>
            </div>
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
            <BookOpen className="w-4 h-4" /> 記事を読む
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

        {/* 1. 記事一覧・本文表示タブ */}
        {activeTab === 'reader' && (
          <div>
            {!selectedArticle ? (
              /* 英字新聞一覧画面 */
              <div className="space-y-5">
                {SAMPLE_ARTICLES.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => handleSelectArticle(article)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                  >
                    {/* イメージ画像 */}
                    <img src={article.imageUrl} alt={article.title} className="w-full h-44 object-cover" />
                    <div className="p-4">
                      <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">{article.source}</span>
                      {/* 見出し (英文) */}
                      <h2 className="text-base font-bold text-gray-900 mt-1 leading-snug">{article.title}</h2>
                      {/* 見出し下の常時日本語訳 */}
                      <p className="text-xs text-gray-500 mt-2 font-medium">{article.translatedTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 記事詳細本文画面 */
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs text-blue-600 mb-3 block font-semibold"
                >
                  ← 記事一覧に戻る
                </button>
                
                <h1 className="text-lg font-bold leading-tight text-gray-900">{selectedArticle.title}</h1>
                <p className="text-xs text-gray-500 mt-1 mb-4">{selectedArticle.translatedTitle}</p>

                {/* 英文本文 (タップ翻訳・音声読み上げ同期ハイライト付き) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 leading-relaxed text-base space-y-3">
                  {allWords.map((word, index) => {
                    const isHighlighted = currentWordGlobalIdx === index;
                    return (
                      <span
                        key={index}
                        ref={(el) => { wordRefs.current[index] = el; }}
                        onClick={() => handleWordClick(word)}
                        className={`inline-block cursor-pointer px-0.5 rounded transition-colors ${
                          isHighlighted
                            ? 'bg-blue-600 text-white font-bold scale-105'
                            : 'hover:bg-blue-50 active:bg-blue-100 text-gray-800'
                        }`}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </div>

                {/* タップした翻訳・イディオム結果の羅列表示エリア */}
                {translations.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">タップした訳・解析履歴</h3>
                    {translations.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{item.originalText}</span>
                            {item.isIdiom && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                イディオム検出
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{item.translatedText}</p>
                        </div>
                        <button
                          onClick={() => handleSaveToDictionary(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 active:scale-125 transition"
                          title="辞書に保存"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. 単語帳（辞書）一覧表示タブ */}
        {activeTab === 'dictionary' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 mb-2">保存した単語帳</h2>
            {dictionary.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">保存された単語や熟語はありません</p>
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
                  {/* 個別削除ボタン */}
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

        {/* 3. 閲覧履歴一覧表示タブ */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700 mb-2">閲覧した英字新聞</h2>
            {history.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">閲覧履歴はありません</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-900 leading-snug">{item.title}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">閲覧日時: {item.readAt}</p>
                  </div>
                  {/* 個別削除ボタン */}
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
    </div>
  );
}