'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Bookmark, Trash2, BookOpen, History, RefreshCw, Globe, Languages } from 'lucide-react';

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

// 単語・イディオム辞書データベース（英字新聞でよく使われる重要単語・熟語）
const DICTIONARY_DB: Record<string, { translation: string; isIdiom: boolean }> = {
  // イディオム
  "break new ground": { translation: "新境地を開拓する・革新を起こす", isIdiom: true },
  "keep up with": { translation: "〜に遅れずについていく", isIdiom: true },
  "fall behind": { translation: "〜に遅れをとる", isIdiom: true },
  "pave the way": { translation: "〜への道を切り開く", isIdiom: true },
  "take into account": { translation: "〜を考慮に入れる", isIdiom: true },
  "in light of": { translation: "〜に照らして・〜を考慮して", isIdiom: true },

  // 重要単語
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
  "energy": { translation: "エネルギー", isIdiom: false },
  "renewable": { translation: "再生可能な", isIdiom: false },
  "market": { translation: "市場、マーケット", isIdiom: false },
  "investments": { translation: "投資、出資", isIdiom: false }
};

// 15個の長文ニュースデータベース (5分程度で読める文量)
const RAW_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Global Tech Summit Unveils Next-Generation AI Solutions',
    translatedTitle: '世界テックサミット、次世代AIソリューションを発表',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    source: 'Global Tech News',
    paragraphs: [
      { en: "Tech leaders from around the world gathered today to showcase breakthrough artificial intelligence systems designed to tackle complex global challenges.", ja: "世界中のテックリーダーが本日集まり、複雑な地球規模の課題に対処するために設計された飛躍的な人工知能システムをお披露目しました。" },
      { en: "Industry experts emphasized that these novel tools will break new ground in environmental science and medical research.", ja: "業界の専門家は、これらの斬新なツールが環境科学や医療研究において新境地を開拓すると強調しました。" },
      { en: "The event highlighted the importance of global collaboration to keep up with rapid technological advancements.", ja: "このイベントでは、急速な技術的進歩に遅れずについていくための国際協力の重要性が強調されました。" },
      { en: "Furthermore, several startups introduced low-power computing chips capable of processing massive data directly on mobile devices.", ja: "さらに、複数のスタートアップ企業が、モバイル端末上で直接大量のデータを処理できる低電力コンピューティングチップを発表しました。" },
      { en: "Governments and regulatory bodies expressed willingness to support innovation while ensuring privacy and ethical safety guidelines.", ja: "政府や規制機関は、プライバシーと倫理的な安全ガイドラインを確保しつつ、イノベーションを支援する姿勢を示しました。" },
      { en: "Organizers reported record attendance from students, researchers, and venture capitalists keen on discovering the next big transformation.", ja: "主催者によると、次の大きな変革を見定めようとする学生、研究者、ベンチャーキャピタリストから過去最高の参加登録があったとのことです。" }
    ]
  },
  {
    id: '2',
    title: 'Historic Climate Accord Signed by Over 50 Nations',
    translatedTitle: '50か国以上が歴史的な気候協定に署名',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    source: 'World Climate Post',
    paragraphs: [
      { en: "Delegates reached a milestone consensus to drastically reduce carbon emissions over the coming decade.", ja: "代表団は今後10年間で二酸化炭素排出量を劇的に削減するという画期的な合意に達しました。" },
      { en: "Environmentalists praised the agreement, urging participating nations not to fall behind on their ambitious sustainability targets.", ja: "環境活動家らはこの合意を称賛し、参加国に対し野心的な持持続可能性目標に遅れをとらないよう呼びかけました。" },
      { en: "Implementation will begin immediately with international support packages for developing economies.", ja: "途上国向けの国際支援パッケージとともに、即座に実施が開始されます。" },
      { en: "Clean energy transition funds will be established to build solar and wind installations in remote coastal regions.", ja: "沿岸の離島地域に太陽光発電や風力発電施設を建設するため、クリーンエネルギー移行基金が設立されます。" },
      { en: "Policy makers believe that strict compliance mechanisms will hold governments accountable for meeting annual goals.", ja: "政策立案者らは、厳格な遵守メカニズムにより各政府が年次目標達成の責任を負うことになると考えています。" },
      { en: "Local communities are expected to participate directly in monitoring regional biodiversity and conservation projects.", ja: "地域社会が、地域の生物多様性や保全プロジェクトの監視に直接参加することが期待されています。" }
    ]
  },
  {
    id: '3',
    title: 'Electric Vehicle Battery Innovation Promises 1000km Range',
    translatedTitle: 'EVバッテリーの革新、航続距離1000kmを実現へ',
    imageUrl: 'https://images.unsplash.com/photo-1558441719-67798286f935?auto=format&fit=crop&w=800&q=80',
    source: 'Auto Industry Journal',
    paragraphs: [
      { en: "Engineers have developed a solid-state battery technology that promises to transform the electric vehicle market.", ja: "技術者たちは電気自動車市場を変革すると期待される全固体電池技術を開発しました。" },
      { en: "The new design improves energy density by nearly sixty percent while significantly shortening charging times.", ja: "新設計により、充電時間を大幅に短縮しながらエネルギー密度を約60％向上させています。" },
      { en: "Automakers are preparing to integrate these units into commercial models over the next three years.", ja: "自動車メーカーは、今後3年間でこれらのユニットを市販モデルに統合する準備を進めています。" },
      { en: "Consumers will benefit from reduced battery degradation and lower overall vehicle maintenance costs.", ja: "消費者にとっては、バッテリー劣化の軽減と全体的な車両メンテナンス費用の削減という恩恵が得られます。" },
      { en: "Safety tests showed superior thermal resistance compared with conventional lithium-ion batteries.", ja: "安全試験では、従来の全固体リチウムイオン電池と比較して優れた耐熱性が示されました。" },
      { en: "Industry analysts predict this advancement will dramatically accelerate global EV adoption.", ja: "業界のアナリストは、この技術進歩が世界的な電気自動車の普及を劇的に加速させると予測しています。" }
    ]
  },
  {
    id: '4',
    title: 'Lunar Mission Transmits High-Definition Images of Moon Crater',
    translatedTitle: '月探査ミッション、月のクレーターの高画質画像を送信',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    source: 'Astro Science Daily',
    paragraphs: [
      { en: "An autonomous space probe successfully landed near the lunar south pole earlier this morning.", ja: "今朝未明、自律型宇宙探査機が月の南極付近への着陸に成功しました。" },
      { en: "Scientists received breathtaking high-definition imagery revealing hidden water ice reserves inside deep craters.", ja: "科学者たちは深いクレーターの中に隠された水氷の存在を示す、息をのむような高画質画像を受信しました。" },
      { en: "The data will help researchers plan long-term human lunar habitats and resource extraction facilities.", ja: "このデータは、長期的な人類の月面基地や資源採掘施設の計画に役立つ予定です。" },
      { en: "International partnerships contributed key sensors and solar power panels for the mission.", ja: "国際的なパートナーシップにより、ミッション向けに主要なセンサーや太陽光パネルが提供されました。" },
      { en: "Robotic drills will begin collecting soil samples later this week to analyze geological history.", ja: "地質学的な歴史を分析するため、今週末にロボットドリルが土壌サンプルの採取を開始します。" },
      { en: "The space agency plans to share all gathered telemetry openly with global research institutions.", ja: "宇宙機関は、収集したすべてのテレメトリデータを世界の研究機関と公開共有する計画です。" }
    ]
  },
  {
    id: '5',
    title: 'Global Financial Forum Addresses Inflation and Market Dynamics',
    translatedTitle: '世界金融フォーラム、インフレと市場動向を協議',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    source: 'Financial Times Update',
    paragraphs: [
      { en: "Central bankers gathered to evaluate macroeconomic policies aimed at stabilizing consumer prices.", ja: "中央銀行総裁らが集まり、物価安定を目指したマクロ経済政策の評価を行いました。" },
      { en: "Economists discussed trade supply chain resilience and currency fluctuations in developing regions.", ja: "経済学者たちは途上国におけるサプライチェーンの強靭化や為替変動について議論しました。" },
      { en: "Keynote speakers recommended balanced fiscal spending and targeted investments in digital infrastructure.", ja: "基調講演者らは、バランスの取れた財政支出とデジタルインフラへのピンポイント投資を推奨しました。" },
      { en: "Financial institutions were encouraged to strengthen cybersecurity protocols against digital fraud.", ja: "金融機関には、デジタル詐欺に対するサイバーセキュリティプロトコルの強化が促されました。" },
      { en: "Recent indicators suggest moderate economic growth across major manufacturing sectors.", ja: "最近の指標は、主要な製造業セクター全体で穏やかな経済成長が続いていることを示しています。" },
      { en: "Delegates concluded the forum by expressing confidence in international monetary cooperation.", ja: "代表団は国際金融協力への信頼を表明してフォーラムを締めくくりました。" }
    ]
  },
  {
    id: '6',
    title: 'Breakthrough Cancer Gene Therapy Shows Promising Trial Results',
    translatedTitle: 'がん遺伝子治療の革新、治験で有望な結果を示す',
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
    source: 'Medical Discoveries',
    paragraphs: [
      { en: "Clinical trials revealed high success rates for a new targeted cell-editing treatment.", ja: "臨床試験において、新しい標的型細胞編集治療の高い成功率が明らかになりました。" },
      { en: "Patients experienced minimal side effects compared to traditional chemotherapy regimens.", ja: "患者らは従来の化学療法と比較して副作用が極めて軽微であったと報告されています。" },
      { en: "Oncologists noted that early intervention yielded significant long-term remission in most subjects.", ja: "腫瘍学者らは、早期介入によりほとんどの被験者で大幅な長期的寛解が得られたと述べています。" },
      { en: "Regulatory authorities are reviewing the data to grant expedited approval for public use.", ja: "規制当局は、一般利用に向けた迅速承認を与えるためデータを審査しています。" },
      { en: "Hospital networks are already training specialized personnel to administer the therapy safely.", ja: "病院ネットワークは治療を安全に投与するため、すでに専門人員の訓練を開始しています。" },
      { en: "Researchers hope this platform can be adapted to treat other rare genetic disorders.", ja: "研究者らは、このプラットフォームが他の稀少遺伝性疾患の治療にも応用できることを期待しています。" }
    ]
  },
  {
    id: '7',
    title: 'Cybersecurity Alliance Formed to Combat Global Cloud Threats',
    translatedTitle: 'クラウドの脅威に対抗するためサイバーセキュリティ同盟を結成',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    source: 'Tech Security Review',
    paragraphs: [
      { en: "Major cloud service providers signed a joint treaty to share real-time threat intelligence.", ja: "大手クラウドサービス事業者が、リアルタイムの脅威インテリジェンスを共有する共同協定に署名しました。" },
      { en: "The initiative aims to prevent coordinated ransomware attacks on critical infrastructure.", ja: "この取り組みは、重要インフラへの組織的な身代金要求型（ランサムウェア）攻撃を防止することを目的としています。" },
      { en: "AI algorithms will monitor network traffic anomalies across connected datacenters worldwide.", ja: "AIアルゴリズムが、世界中の連携されたデータセンター間のネットワークトラフィック異常を監視します。" },
      { en: "Security experts urged corporations to implement multi-factor authentication everywhere.", ja: "セキュリティの専門家は、企業に対しあらゆるシステムで多要素認証を導入するよう呼びかけました。" },
      { en: "Training modules will be offered free to small businesses seeking basic protection standards.", ja: "基本的な保護基準を求める中小企業向けに、トレーニングモジュールが無料で提供される予定です。" },
      { en: "Governments praised the private sector for taking proactive measures against digital crime.", ja: "政府機関は、デジタル犯罪に対して主体的な対策を講じた民間セクターを称賛しました。" }
    ]
  },
  {
    id: '8',
    title: 'Offshore Wind Farm Sets New Renewable Power Generation Record',
    translatedTitle: '洋上風力発電所が再生可能エネルギー発電の最高記録を更新',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80',
    source: 'Clean Energy Today',
    paragraphs: [
      { en: "A massive offshore wind facility supplied power to over one million homes during peak winds.", ja: "大規模な洋上風力発電施設が、風のピーク時に100万世帯以上に電力を供給しました。" },
      { en: "Giant turbines equipped with lightweight composite blades achieved unprecedented efficiency.", ja: "軽量の複合素材ブレードを備えた巨大タービンが、これまでにない高効率を実現しました。" },
      { en: "Engineers designed the foundation structures to withstand severe ocean storms and waves.", ja: "エンジニアは猛烈な海の嵐や高波にも耐えられる海洋構造物を設計しました。" },
      { en: "Excess electricity was stored using grid-scale chemical battery banks near the shore.", ja: "余剰電力は、沿岸近くの電力網規模の化学蓄電池バンクに保存されました。" },
      { en: "Local fishing communities reported no negative environmental impacts on marine wildlife.", ja: "地元の漁業コミュニティからは、海洋野生生物への悪影響は報告されていません。" },
      { en: "Project managers plan to expand capacity by adding twenty more turbines next summer.", ja: "プロジェクトマネージャーは、来夏にさらに20基のタービンを追加して容量を拡大する計画です。" }
    ]
  },
  {
    id: '9',
    title: 'Cultural Heritage Sites Use 3D Scanning for Preservation',
    translatedTitle: '文化遺産保存のために3Dスキャン技術を活用',
    imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80',
    source: 'Culture & World Heritage',
    paragraphs: [
      { en: "Archaeologists are capturing detailed digital replicas of ancient stone monuments.", ja: "考古学者たちが、古代の石造物遺跡の精細なデジタル複製（レプリカ）を記録しています。" },
      { en: "Laser scanning preserves minute carvings and inscriptions vulnerable to erosion.", ja: "レーザースキャンにより、風化のリスクがある微細な彫刻や碑文を保存することができます。" },
      { en: "Museums worldwide will allow virtual visitors to explore these historical sites in 3D.", ja: "世界中の博物館が、バーチャル来訪者にこれらの歴史的遺影を3Dで探訪できるようにします。" },
      { en: "Drones equipped with LiDAR sensors scanned dense jungle areas to reveal lost buildings.", ja: "LiDAR（光検出と測距）センサーを搭載したドローンが密林地域をスキャンし、埋もれていた建造物を発見しました。" },
      { en: "Restoration teams use these volumetric models to repair damaged structural elements.", ja: "修復チームは、損傷した構造要素を補修するためにこれらの三次元モデルを活用しています。" },
      { en: "The public database enables researchers to analyze architectural changes over centuries.", ja: "公開データベースにより、研究者は何世紀にもわたる建築の変化を分析できます。" }
    ]
  },
  {
    id: '10',
    title: 'EdTech Revolution: Interactive Classrooms Transform Learning',
    translatedTitle: 'EdTech革命：双方向教室が学習のあり方を変革',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
    source: 'Education Vision',
    paragraphs: [
      { en: "Schools are incorporating real-time feedback systems to personalize student lesson plans.", ja: "学校は、生徒のレッスンプランを個別化するためにリアルタイムのフィードバックシステムを導入しています。" },
      { en: "Interactive simulations allow children to conduct complex chemistry experiments safely.", ja: "双方向シミュレーションにより、子供たちが複雑な化学実験を安全に行えるようになります。" },
      { en: "Teachers reported higher engagement levels and better retention during STEM topics.", ja: "教師からは、STEM分野のトピックにおける集中力や記憶定着率の向上報告が上がっています。" },
      { en: "Rural communities received high-speed satellite internet connections to support learning.", ja: "農村地域には、学習を支援するために高速衛星インターネット接続が提供されました。" },
      { en: "Privacy measures ensure that student performance analytics remain strictly confidential.", ja: "プライバシー対策により、生徒のパフォーマンス分析データの厳格な秘匿性が確保されています。" },
      { en: "Educational experts predict a shift toward project-based collaboration across borders.", ja: "教育専門家は、国境を越えたプロジェクトベースの協働学習へのシフトを予測しています。" }
    ]
  },
  {
    id: '11',
    title: 'Global Marine Sanctuaries Proposed to Protect Ocean Life',
    translatedTitle: '海洋生物保護のため広大な海洋保護区の創設を提案',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    source: 'Ocean Conservation',
    paragraphs: [
      { en: "Biologists proposed establishing new protected ocean zones covering critical coral reefs.", ja: "生物学者らは、重要な珊瑚礁をカバーする新たな海洋保護区の設立を提案しました。" },
      { en: "Unregulated fishing and industrial dumping will be prohibited in these designated sanctuaries.", ja: "指定された保護区では、無規制の漁業や産業廃棄物の投棄が禁止されます。" },
      { en: "Satellite monitoring networks will track maritime traffic to enforce maritime environmental law.", ja: "海洋環境法を施行するため、衛星監視ネットワークが船舶の運航状況を追跡します。" },
      { en: "Ecotourism initiatives will support local coastal economies while encouraging nature preservation.", ja: "エコツーリズムの取り組みが自然保護を促す一方で、地元の沿岸経済を支えます。" },
      { en: "Researchers observed coral recovery within older protected areas over five consecutive years.", ja: "研究者らは、古い保護区内において5年連続でサンゴ礁の回復を確認しました。" },
      { en: "International funding will cover patrol vessels and underwater acoustic sensor arrays.", ja: "国際資金により、巡視船や水中音響センサーアレイの設置費用がまかなわれます。" }
    ]
  },
  {
    id: '12',
    title: 'Next-Gen Semiconductor Plants Open in Resilient Tech Hubs',
    translatedTitle: '強固なテックハブに次世代半導体工場が開設',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    source: 'Tech Hardware Post',
    paragraphs: [
      { en: "Construction finished on state-of-the-art semiconductor fabrication plants featuring extreme UV lithography.", ja: "極端紫外線リソグラフィ技術を備えた最先端の半導体製造工場の建設が完了しました。" },
      { en: "The facilities will produce sub-two-nanometer microchips for mobile devices and servers.", ja: "これらの施設では、モバイル端末やサーバー向けの2ナノメートル未満のマイクロチップが製造されます。" },
      { en: "Supply chain regionalization aims to prevent manufacturing delays experienced in past years.", ja: "サプライチェーンの地域格差解消により、過去に発生した製造の遅延を防ぐことを目指します。" },
      { en: "Thousands of high-skilled engineering jobs were created during the initial hiring phase.", ja: "初期採用フェーズにおいて、数千人規模の高度なエンジニア求人が創出されました。" },
      { en: "Recycling systems installed on-site will recover ninety percent of industrial water used.", ja: "敷地内に設置されたリサイクルシステムにより、使用される産業用水の90%が回収・再利用されます。" },
      { en: "Government tax incentives encouraged long-term corporate investment in domestic tech manufacturing.", ja: "政府の税制優遇措置が、国内の技術製造業への企業の長期的投資を後押ししました。" }
    ]
  },
  {
    id: '13',
    title: 'Smart Cities Adopt Automated Public Transit for Cleaner Mobility',
    translatedTitle: 'スマートシティ、クリーンな移動を目指し自動公共交通を導入',
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80',
    source: 'Urban Living Today',
    paragraphs: [
      { en: "Metropolitan transit authorities deployed autonomous electric buses on inner-city routes.", ja: "都市交通局は、都心部のルートに自律走行型電気バスを配備しました。" },
      { en: "Sensors and dedicated lanes ensure pedestrian safety and punctual arrivals during peak hours.", ja: "センサーと専用レーンにより、通勤ラッシュ時の歩行者の安全と定時到着が確保されます。" },
      { en: "Passengers can pay fares seamlessly using contactless smartphones or biometric tokens.", ja: "乗客は、非接触スマホや生体認証トークンを使ってスムーズに運賃を支払うことができます。" },
      { en: "Traffic control algorithms adjust traffic light timing to reduce idle vehicle stop times.", ja: "交通制御アルゴリズムが信号のタイミングを自動調整し、車両の停車時間を削減します。" },
      { en: "Air quality sensors showed immediate reductions in nitrogen dioxide along transit corridors.", ja: "空気質センサーは、交通網に沿って二酸化窒素濃度の即座の低下を示しました。" },
      { en: "City councils plan to expand self-driving shuttle services to surrounding suburban neighborhoods.", ja: "市議会は、自動運転シャトルサービスを周辺の郊外住宅地へと拡大する計画です。" }
    ]
  },
  {
    id: '14',
    title: 'Deep Ocean Exploration Uncovers New Hydrothermal Vents',
    translatedTitle: '深海探査により新たな熱水鉱床（ベント）を発見',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    source: 'Deep Sea Exploration',
    paragraphs: [
      { en: "Submersibles equipped with high-pressure cameras discovered thriving deep-sea ecosystems.", ja: "高圧カメラを搭載した潜水艇が、生命で満ちあふれた深海生態系を発見しました。" },
      { en: "Organisms surviving in total darkness rely on chemosynthesis rather than sunlight for energy.", ja: "完全な闇の中で生き抜く生物たちは、エネルギーを太陽光ではなく化学合成に頼っています。" },
      { en: "Geologists identified rich mineral deposits surrounding the thermal vents miles below the surface.", ja: "地質学者たちは、海底数マイル下の熱水噴出孔周辺で豊かな鉱物資源を確認しました。" },
      { en: "Samples gathered will help scientists understand how early life may have evolved on Earth.", ja: "採取されたサンプルは、地球上の初期の生命がどのように進化してきたかを解明する手がかりとなります。" },
      { en: "International conventions prohibit commercial seabed mining in designated ocean trenches.", ja: "国際条約により、指定された海溝での商業的な深海底採掘は禁止されています。" },
      { en: "Research teams will publish detailed maps of the abyssal plain later this winter.", ja: "研究チームは今冬後半に、深海平原の詳細な地図を公開する予定です。" }
    ]
  },
  {
    id: '15',
    title: 'Global Agriculture Conference Targets Climate Resilience',
    translatedTitle: '世界農業会議、気候レジリエンス（回復力）向上を目指す',
    imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    source: 'AgriTech Weekly',
    paragraphs: [
      { en: "Agronomists introduced drought-tolerant crop varieties to protect smallholder farmers.", ja: "農学者が、小規模農家を守るために耐乾性のある作物品種を導入しました。" },
      { en: "Precision farming tools utilize satellite imagery to optimize water and fertilizer usage.", ja: "精密農業ツールは、衛星画像を活用して水や肥料の使用量を最適化します。" },
      { en: "Soil health initiatives encourage crop rotation and organic composting techniques globally.", ja: "土壌の健康管理の取り組みが、世界的に輪作や有機堆肥化技術を促進しています。" },
      { en: "Food security experts stressed the need to minimize post-harvest transport losses.", ja: "食料安全保障の専門家は、収穫後の輸送ロスを最小限に抑える必要性を強調しました。" },
      { en: "Microfinance loans will assist local farming cooperatives in purchasing solar irrigation pumps.", ja: "マイクロファイナンス融資により、地域の農協が太陽光発電散水ポンプを購入できるよう支援します。" },
      { en: "Delegates agreed that sustainable agriculture is key to feeding future global populations.", ja: "代表者らは、持続可能な農業が将来の世界人口に食料を供給する鍵であることで合意しました。" }
    ]
  }
];

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentWordGlobalIdx, setCurrentWordGlobalIdx] = useState<number | null>(null);
  
  // 「すべて翻訳」機能: 行ごとに直下へ翻訳を表示するフラグ
  const [showAllTranslations, setShowAllTranslations] = useState<boolean>(false);

  // 翻訳履歴・辞書・閲覧履歴
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [dictionary, setDictionary] = useState<SavedWord[]>([]);
  const [history, setHistory] = useState<ArticleHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'reader' | 'dictionary' | 'history'>('reader');

  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // ページ読み込み/更新時に記事リストをランダムシャッフルして切り替え
  const shuffleAndSetArticles = () => {
    const shuffled = [...RAW_ARTICLES].sort(() => Math.random() - 0.5);
    setArticles(shuffled);
  };

  useEffect(() => {
    shuffleAndSetArticles();

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

    const now = new Date().toLocaleString('ja-JP');
    const filtered = history.filter((h) => h.id !== article.id);
    const updatedHistory = [{ id: article.id, title: article.title, readAt: now }, ...filtered];
    saveHistoryToStorage(updatedHistory);
  };

  // 全文章の単語配列を作成
  const fullText = selectedArticle ? selectedArticle.paragraphs.map(p => p.en).join(' ') : '';
  const allWords = fullText ? fullText.split(' ') : [];

  // 音声読み上げ & ハイライト機能
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

  // 単語・イディオムタップ翻訳機能
  const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!cleanWord) return;

    // 辞書データベースから単語またはイディオムを検索
    const match = DICTIONARY_DB[cleanWord];
    
    const newItem: TranslationItem = {
      id: Date.now().toString(),
      originalText: cleanWord,
      translatedText: match ? match.translation : `${cleanWord}: （一般的な辞書的な意味・訳）`,
      isIdiom: match ? match.isIdiom : false
    };

    setTranslations((prev) => [newItem, ...prev]);
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 select-none">
      {/* 固定UIヘッダー */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm px-4 py-3">
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
              onClick={shuffleAndSetArticles}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-xs font-semibold flex items-center gap-1"
              title="記事を更新"
            >
              <RefreshCw className="w-4 h-4" /> 記事入れ替え
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* タブナビゲーション */}
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('reader')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1 ${
              activeTab === 'reader' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'
            }`}
          >
            <BookOpen className="w-4 h-4" /> 記事一覧
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
            <History className="w-4 h-4" /> 履歴 ({history.length})
          </button>
        </div>

        {/* 1. 記事閲覧タブ */}
        {activeTab === 'reader' && (
          <div>
            {!selectedArticle ? (
              /* 英字新聞 15件一覧表示 */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">全15件の最新ニュース（更新で入れ替え）</span>
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
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{article.source}</span>
                      {/* 英語見出し */}
                      <h2 className="text-sm font-bold text-gray-900 mt-1 leading-snug">{article.title}</h2>
                      {/* 見出し下の常時日本語訳 */}
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">{article.translatedTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 本文詳細表示 (段落ごとに英文と日本語訳を表示) */
              <div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-xs text-blue-600 mb-3 block font-semibold"
                >
                  ← 記事一覧に戻る
                </button>
                
                <h1 className="text-base font-bold leading-tight text-gray-900">{selectedArticle.title}</h1>
                <p className="text-xs text-gray-500 mt-1 mb-4 font-medium">{selectedArticle.translatedTitle}</p>

                {/* 段落ごとの本文表示 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                  {(() => {
                    let runningWordIndex = 0;
                    return selectedArticle.paragraphs.map((paragraph, pIdx) => {
                      const words = paragraph.en.split(' ');
                      const paragraphStartIndex = runningWordIndex;
                      runningWordIndex += words.length;

                      return (
                        <div key={pIdx} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          {/* 英文（単語タップ＆ハイライト） */}
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

                          {/* すべて翻訳がオンの場合、各段落（行）の直下に日本語訳を表示 */}
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

                {/* 単語タップ翻訳・イディオム検出結果のストリーム一覧 */}
                {translations.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">タップした単語・訳一覧</h3>
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
                                イディオム
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{item.translatedText}</p>
                        </div>
                        <button
                          onClick={() => handleSaveToDictionary(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 active:scale-125 transition"
                          title="単語帳に保存"
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
    </div>
  );
}