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

// ローカル単語・イディオム辞書
const LOCAL_DICTIONARY: Record<string, string> = {
  "scientists": "科学者たち、研究者",
  "scientist": "科学者、研究者",
  "leaders": "指導者たち、首脳陣",
  "officials": "政府高官、当局者たち",
  "governments": "各国の政府",
  "researchers": "研究者たち、調査員",
  "experts": "専門家たち、有識者",
  "countries": "諸国、各国の",
  "deepsea": "深海の、遠洋の",
  "global": "世界的な、地球規模の",
  "climate": "気候、環境",
  "economy": "経済、景気",
  "market": "市場、マーケット",
  "infrastructure": "社会基盤、インフラ",
  "development": "発展、開発、動向",
  "break new ground": "新境地を開拓する",
  "keep up with": "〜に遅れずについていく",
  "fall behind": "〜に遅れをとる",
  "pave the way": "〜への道を切り開く"
};

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordGlobalIdx, setCurrentWordGlobalIdx] = useState<number | null>(null);

  const paragraphStartWordIndicesRef = useRef<number[]>([]);
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(false);

  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [dictionary, setDictionary] = useState<SavedWord[]>([]);
  const [history, setHistory] = useState<ArticleHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'reader' | 'dictionary' | 'history'>('reader');
  const [isTranslationPanelExpanded, setIsTranslationPanelExpanded] = useState<boolean>(true);

  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // 大量取得プールからランダム15件を取得・更新
  const fetchRandom15News = async () => {
    setIsLoadingNews(true);
    try {
      const res = await fetch(`/api/news?t=${Date.now()}`); // キャッシュ回避
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (e) {
      console.error('Failed to fetch news', e);
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchRandom15News();

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

    // 行頭単語のグローバルインデックス位置を計算
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

  const fullText = selectedArticle ? selectedArticle.paragraphs.map((p) => p.en).join(' ') : '';

  // 音声読み上げ & 行頭単語位置での自動スクロール
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

        // 各行頭の英語を読んだタイミングでのみ画面をスクロール
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

  // 単語タップ翻訳・高精度表示
  const handleWordClick = async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    let translatedResult = '';
    let isIdiom = false;

    if (LOCAL_DICTIONARY[cleanWord]) {
      translatedResult = LOCAL_DICTIONARY[cleanWord];
    } else {
      const stemWord = cleanWord.replace(/s$/, '').replace(/ed$/, '').replace(/ing$/, '');
      if (LOCAL_DICTIONARY[stemWord]) {
        translatedResult = LOCAL_DICTIONARY[stemWord];
      } else {
        try {
          const apiRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|ja`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            const apiTranslation = data.responseData?.translatedText;
            if (apiTranslation && !apiTranslation.includes('MYMEMORY')) {
              translatedResult = apiTranslation;
            }
          }
        } catch (e) {}

        if (!translatedResult) {
          translatedResult = `${cleanWord}（名詞・動詞）`;
        }
      }
    }

    const newItem: TranslationItem = {
      id: Date.now().toString(),
      originalText: cleanWord,
      translatedText: translatedResult,
      isIdiom: isIdiom,
    };

    setTranslations((prev) => [newItem, ...prev]);
    setIsTranslationPanelExpanded(true);
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
              onClick={fetchRandom15News}
              disabled={isLoadingNews}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-xs font-semibold flex items-center gap-1 transition"
              title="世界のニュースから15件をランダム更新"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNews ? 'animate-spin' : ''}`} /> 15件シャッフル更新
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* タブ */}
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
              /* ランダム表示される15件のニュース一覧 */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">直近1か月の海外ニュースよりランダム15件を表示中</span>
                </div>
                {isLoadingNews ? (
                  <div className="text-center py-12 text-gray-400 text-xs">ニュースを大量取得中...</div>
                ) : (
                  articles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => handleSelectArticle(article)}
                      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-98 transition-transform"
                    >
                      <img src={article.imageUrl} alt={article.title} className="w-full h-40 object-cover" />
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{article.source}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{article.country}</span>
                        </div>
                        <h2 className="text-sm font-bold text-gray-900 mt-1 leading-snug">{article.title}</h2>
                        <p className="text-xs text-gray-500 mt-1.5 font-medium">{article.translatedTitle}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* 20行（段落）以上の本格ニュース長文表示画面 */
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs text-blue-600 mb-3 block font-semibold"
                >
                  ← ニュース一覧に戻る
                </button>

                <h1 className="text-base font-bold leading-tight text-gray-900">{selectedArticle.title}</h1>
                <p className="text-xs text-gray-500 mt-1 mb-4 font-medium">{selectedArticle.translatedTitle}</p>

                {/* 20段落本文 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                  {(() => {
                    let runningWordIndex = 0;
                    return selectedArticle.paragraphs.map((paragraph, pIdx) => {
                      const words = paragraph.en.split(' ');
                      const paragraphStartIndex = runningWordIndex;
                      runningWordIndex += words.length;

                      return (
                        <div key={pIdx} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          {/* 英文表示 & 単語タップ */}
                          <div className="leading-relaxed text-sm text-gray-800">
                            {words.map((word, wIdx) => {
                              const globalIndex = paragraphStartIndex + wIdx;
                              const isHighlighted = currentWordGlobalIdx === globalIndex;

                              return (
                                <span
                                  key={wIdx}
                                  ref={(el) => {
                                    wordRefs.current[globalIndex] = el;
                                  }}
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

                          {/* 「すべて翻訳」時に各段落（行）の直下に日本語訳を表示 */}
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
            <h2 className="text-xs font-bold text-gray-500 mb-2">保存した単語帳</h2>
            {dictionary.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">保存された単語はありません</p>
            ) : (
              dictionary.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-gray-900">{item.original}</span>
                    <p className="text-xs text-gray-600 mt-1">{item.translation}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDictionaryItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
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
            <h2 className="text-xs font-bold text-gray-500 mb-2">閲覧履歴</h2>
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
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* 画面下部固定のタップ翻訳パネル */}
      {translations.length > 0 && selectedArticle && activeTab === 'reader' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white border-t border-gray-300 shadow-2xl rounded-t-2xl overflow-hidden transition-all duration-300">
          <div
            onClick={() => setIsTranslationPanelExpanded(!isTranslationPanelExpanded)}
            className="bg-gray-100 px-4 py-2 flex items-center justify-between cursor-pointer border-b border-gray-200"
          >
            <span className="text-xs font-bold text-gray-700">タップした英単語・訳 ({translations.length})</span>
            <button className="text-gray-500">
              {isTranslationPanelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {isTranslationPanelExpanded && (
            <div className="max-h-48 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {translations.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-gray-900">{item.originalText}</span>
                    <p className="text-xs text-gray-700 font-semibold mt-0.5">{item.translatedText}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSaveToDictionary(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                      title="単語帳に保存"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTranslationItem(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition"
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