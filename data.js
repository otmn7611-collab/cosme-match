// ===== マスタ定義とサンプルデータ =====
// サンプル商品はすべて架空のブランド・商品です（実在の商品とは関係ありません）。

window.COSME_CATS = [
  { id: "lotion",    label: "化粧水",         kw: "化粧水" },
  { id: "serum",     label: "美容液",         kw: "美容液" },
  { id: "milk",      label: "乳液・クリーム", kw: "乳液" },
  { id: "cleansing", label: "クレンジング",   kw: "クレンジング" },
  { id: "sunscreen", label: "日焼け止め",     kw: "日焼け止め" },
  { id: "base",      label: "ベースメイク",   kw: "ファンデーション" }
];

window.COSME_SKINS = [
  { id: "dry",       label: "乾燥肌" },
  { id: "oily",      label: "脂性肌" },
  { id: "combo",     label: "混合肌" },
  { id: "sensitive", label: "敏感肌" },
  { id: "normal",    label: "普通肌" }
];

// 商品名から成分タグを推定するキーワード
window.COSME_INGREDIENTS = [
  { id: "retinol",  label: "レチノール",       kw: ["レチノール", "レチナール", "retinol", "Retinol"] },
  { id: "vitc",     label: "ビタミンC",        kw: ["ビタミンC", "ビタミンＣ", "VC", "アスコルビン"] },
  { id: "acid",     label: "AHA/BHA",          kw: ["ピーリング", "AHA", "BHA", "サリチル酸", "グリコール酸", "角質"] },
  { id: "niacin",   label: "ナイアシンアミド", kw: ["ナイアシンアミド"] },
  { id: "ceramide", label: "セラミド",         kw: ["セラミド"] },
  { id: "ha",       label: "ヒアルロン酸",     kw: ["ヒアルロン酸"] },
  { id: "cica",     label: "CICA",             kw: ["シカ", "CICA", "cica", "ツボクサ"] }
];

// 併用時の一般的な注意・ヒント（効果効能を断定しない表現にしています）
window.COSME_RULES = [
  { a: "retinol", b: "acid", level: "caution",
    text: "レチノールとピーリング系成分（AHA/BHA）は、どちらも刺激を感じやすい成分です。同じタイミングでの使用は避け、使う日や時間帯を分けるのが一般的です。" },
  { a: "retinol", b: "retinol", level: "caution",
    text: "レチノール配合のアイテム同士の重ね使いは、刺激を感じやすくなることがあります。どちらか一方にするか、使う日を分けると安心です。" },
  { a: "acid", b: "acid", level: "caution",
    text: "ピーリング系成分の重ね使いは、肌への負担を感じやすくなることがあります。使用頻度に注意しましょう。" },
  { a: "retinol", b: "vitc", level: "tip",
    text: "レチノールとビタミンCは、朝はビタミンC・夜はレチノールのように、時間帯を分けて使う人が多い組み合わせです。" },
  { a: "acid", b: "vitc", level: "tip",
    text: "ピーリング系成分とビタミンCを一緒に使ってピリつきを感じる場合は、時間帯を分けると取り入れやすくなります。" },
  { a: "ceramide", b: "retinol", level: "good",
    text: "セラミドなどの保湿成分は、刺激を感じやすい成分と組み合わせて使われることが多い成分です。" },
  { a: "ceramide", b: "acid", level: "good",
    text: "ピーリング系アイテムの後に、セラミドなどの保湿アイテムを重ねる使い方がよく選ばれています。" }
];

// ---- 架空のサンプル商品 ----
// avg/count は「通販サイトのレビュー平均・件数」を想定したダミー値です。
// aff は肌質ごとの相性傾向（サンプル口コミの生成に使用）。
window.COSME_SAMPLE_PRODUCTS = [
  { id: "s01", cat: "lotion", brand: "Mizuha", shop: "Mizuha公式 楽天市場店", name: "薬用モイストローション セラミド配合", price: 1980, avg: 4.62, count: 2841, aff: { dry: 4.7, oily: 3.6, combo: 4.1, sensitive: 4.5, normal: 4.4 } },
  { id: "s02", cat: "lotion", brand: "CLAIRE NOTE", shop: "コスメセレクト ルナ", name: "ビタミンC ブライトローション", price: 2640, avg: 4.41, count: 1530, aff: { dry: 3.7, oily: 4.5, combo: 4.3, sensitive: 3.2, normal: 4.3 } },
  { id: "s03", cat: "lotion", brand: "hanaori", shop: "hanaori オンラインストア", name: "CICA カーミングトナー", price: 1650, avg: 4.55, count: 980, aff: { dry: 4.0, oily: 4.3, combo: 4.4, sensitive: 4.6, normal: 4.2 } },
  { id: "s04", cat: "lotion", brand: "Aqua Veil", shop: "ドラッグストア みどり屋", name: "ヒアルロン酸 たっぷり保湿化粧水 大容量", price: 1100, avg: 4.28, count: 4120, aff: { dry: 4.3, oily: 3.9, combo: 4.1, sensitive: 3.9, normal: 4.3 } },

  { id: "s05", cat: "serum", brand: "LUMINA LAB", shop: "LUMINA LAB 公式ショップ", name: "レチノール ナイトセラム 0.1%", price: 3960, avg: 4.48, count: 1210, aff: { dry: 3.9, oily: 4.4, combo: 4.3, sensitive: 3.0, normal: 4.5 } },
  { id: "s06", cat: "serum", brand: "CLAIRE NOTE", shop: "コスメセレクト ルナ", name: "ビタミンC 美容液 デイリーエッセンス", price: 3300, avg: 4.36, count: 1876, aff: { dry: 3.8, oily: 4.5, combo: 4.3, sensitive: 3.3, normal: 4.3 } },
  { id: "s07", cat: "serum", brand: "Mizuha", shop: "Mizuha公式 楽天市場店", name: "ナイアシンアミド バランスセラム", price: 2420, avg: 4.51, count: 760, aff: { dry: 4.2, oily: 4.5, combo: 4.6, sensitive: 3.9, normal: 4.4 } },
  { id: "s08", cat: "serum", brand: "PEEL & CO.", shop: "コスメセレクト ルナ", name: "AHA/BHA ピーリング美容液", price: 2200, avg: 4.12, count: 640, aff: { dry: 3.2, oily: 4.4, combo: 4.1, sensitive: 2.6, normal: 4.0 } },

  { id: "s09", cat: "milk", brand: "Mizuha", shop: "Mizuha公式 楽天市場店", name: "セラミド バリアクリーム", price: 2310, avg: 4.67, count: 1490, aff: { dry: 4.8, oily: 3.4, combo: 4.0, sensitive: 4.6, normal: 4.4 } },
  { id: "s10", cat: "milk", brand: "Aqua Veil", shop: "ドラッグストア みどり屋", name: "ジェル乳液 さっぱりタイプ", price: 1320, avg: 4.21, count: 2230, aff: { dry: 3.5, oily: 4.5, combo: 4.3, sensitive: 3.9, normal: 4.2 } },
  { id: "s11", cat: "milk", brand: "hanaori", shop: "hanaori オンラインストア", name: "CICA リペアクリーム", price: 1980, avg: 4.44, count: 870, aff: { dry: 4.2, oily: 4.0, combo: 4.3, sensitive: 4.5, normal: 4.2 } },

  { id: "s12", cat: "cleansing", brand: "PURE DROP", shop: "ドラッグストア みどり屋", name: "オイルクレンジング メイクオフ", price: 1760, avg: 4.53, count: 3320, aff: { dry: 4.3, oily: 4.2, combo: 4.4, sensitive: 3.6, normal: 4.5 } },
  { id: "s13", cat: "cleansing", brand: "hanaori", shop: "hanaori オンラインストア", name: "ミルククレンジング 低刺激", price: 1540, avg: 4.32, count: 1180, aff: { dry: 4.5, oily: 3.5, combo: 4.0, sensitive: 4.6, normal: 4.2 } },
  { id: "s14", cat: "cleansing", brand: "Aqua Veil", shop: "ドラッグストア みどり屋", name: "クレンジングバーム クリア", price: 2090, avg: 4.47, count: 2650, aff: { dry: 4.4, oily: 4.1, combo: 4.4, sensitive: 3.9, normal: 4.5 } },

  { id: "s15", cat: "sunscreen", brand: "SUNNE", shop: "SUNNE 楽天市場店", name: "UVエッセンス SPF50+ PA++++", price: 1650, avg: 4.58, count: 5210, aff: { dry: 4.4, oily: 4.4, combo: 4.6, sensitive: 3.9, normal: 4.6 } },
  { id: "s16", cat: "sunscreen", brand: "hanaori", shop: "hanaori オンラインストア", name: "ノンケミカル UVミルク 敏感肌向け", price: 1980, avg: 4.33, count: 1340, aff: { dry: 4.2, oily: 3.8, combo: 4.0, sensitive: 4.6, normal: 4.2 } },

  { id: "s17", cat: "base", brand: "LUMINA LAB", shop: "LUMINA LAB 公式ショップ", name: "ツヤ肌 リキッドファンデーション", price: 3520, avg: 4.39, count: 1720, aff: { dry: 4.6, oily: 3.5, combo: 4.1, sensitive: 3.9, normal: 4.4 } },
  { id: "s18", cat: "base", brand: "SUNNE", shop: "SUNNE 楽天市場店", name: "崩れにくい マットクッションファンデ", price: 2860, avg: 4.27, count: 2090, aff: { dry: 3.4, oily: 4.6, combo: 4.4, sensitive: 3.6, normal: 4.2 } }
];

// サンプルの併用口コミ傾向 [商品A, 商品B, 平均の傾向]
window.COSME_SAMPLE_PAIRS = [
  ["s01", "s09", 4.7], ["s05", "s09", 4.5], ["s05", "s08", 2.6], ["s02", "s06", 4.0],
  ["s06", "s15", 4.6], ["s05", "s15", 4.4], ["s03", "s11", 4.6], ["s07", "s10", 4.4],
  ["s12", "s01", 4.3], ["s08", "s09", 4.2], ["s17", "s15", 4.3], ["s18", "s10", 4.4],
  ["s05", "s06", 3.6], ["s13", "s16", 4.5]
];

// 商品名からメーカー（ブランド）名を見つけるための一覧。
// 楽天APIは「ショップ名」しか返さないため、商品名と照合してメーカーを推定します。
// [表示名, 照合キーワード...] 必要に応じて追加してください。
window.COSME_BRANDS = [
  ["資生堂", "資生堂", "SHISEIDO", "shiseido"], ["エリクシール", "エリクシール", "ELIXIR"], ["アネッサ", "アネッサ", "ANESSA"],
  ["dプログラム", "dプログラム", "d program"], ["イプサ", "イプサ", "IPSA"], ["コーセー", "コーセー", "KOSE"],
  ["雪肌精", "雪肌精"], ["カネボウ", "カネボウ", "KANEBO"], ["花王", "花王"], ["キュレル", "キュレル", "Curel"],
  ["ビオレ", "ビオレ", "Biore"], ["ポーラ", "ポーラ", "POLA"], ["オルビス", "オルビス", "ORBIS"],
  ["ファンケル", "ファンケル", "FANCL"], ["無印良品", "無印良品", "MUJI"], ["肌ラボ", "肌ラボ", "ハダラボ"],
  ["メラノCC", "メラノCC"], ["ミノン", "ミノン", "MINON"], ["SK-II", "SK-II", "SK2"],
  ["ラ ロッシュ ポゼ", "ラロッシュポゼ", "ラ ロッシュ ポゼ", "La Roche-Posay"], ["アベンヌ", "アベンヌ", "Avene"],
  ["ビオデルマ", "ビオデルマ", "BIODERMA"], ["キールズ", "キールズ", "Kiehl"], ["クリニーク", "クリニーク", "CLINIQUE"],
  ["ランコム", "ランコム", "LANCOME", "LANCÔME"], ["エスティ ローダー", "エスティローダー", "エスティ ローダー", "ESTEE LAUDER"],
  ["アヌア", "アヌア", "Anua"], ["メディキューブ", "メディキューブ", "medicube"], ["VT", "VT COSMETICS", "VTコスメ"],
  ["COSRX", "COSRX", "コスアールエックス"], ["イニスフリー", "イニスフリー", "innisfree"], ["ラネージュ", "ラネージュ", "LANEIGE"],
  ["トリデン", "トリデン", "Torriden"], ["ナンバーズイン", "ナンバーズイン", "numbuzin"], ["マニョ", "マニョ", "ma:nyo", "manyo"],
  ["ダルバ", "ダルバ", "d'Alba"], ["スキン1004", "SKIN1004", "スキン1004"]
];
