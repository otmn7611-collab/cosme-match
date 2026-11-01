(() => {
  "use strict";

  const CFG = window.COSME_CONFIG || {};
  const CATS = window.COSME_CATS;
  const SKINS = window.COSME_SKINS;
  const INGS = window.COSME_INGREDIENTS;
  const RULES = window.COSME_RULES;

  const RAKUTEN_ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";
  const BEAUTY_GENRE_ID = 100939; // 美容・コスメ・香水
  const POSTS_KEY = "cosmematch.posts.v1";
  const CACHE_KEY = "cosmematch.rakuten.v1";

  const state = {
    mode: "sample",       // sample | rakuten | fallback
    products: [],
    samplePosts: [],
    userPosts: [],
    cat: "all",
    skin: "dry",
    pairA: "",
    pairB: ""
  };

  // ---------- 小物 ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const yen = (n) => "¥" + Number(n || 0).toLocaleString("ja-JP");
  const catLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || "";
  const skinLabel = (id) => (SKINS.find((s) => s.id === id) || {}).label || "";
  const ingLabel = (id) => (INGS.find((i) => i.id === id) || {}).label || "";
  const byId = (id) => state.products.find((p) => p.id === id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できない環境では無視 */ } }
  };

  function detectMaker(text) {
    const t = String(text || "");
    const hit = (window.COSME_BRANDS || []).find(([, ...kws]) => kws.some((k) => t.includes(k)));
    return hit ? hit[0] : "";
  }

  // サンプル用の商品イメージ（カテゴリごとの容器をSVGで描画）
  function hashHue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  function sampleImage(p) {
    const hue = hashHue(p.maker || p.brand);
    const body = `hsl(${hue} 45% 78%)`, deep = `hsl(${hue} 40% 52%)`, cap = `hsl(${hue} 25% 30%)`;
    const bg = `hsl(${hue} 40% 95%)`;
    const label = esc((p.maker || p.brand || "").slice(0, 10));
    const shapes = {
      lotion: `<rect x="62" y="22" width="36" height="20" rx="4" fill="${cap}"/><rect x="48" y="40" width="64" height="104" rx="14" fill="${body}"/><rect x="56" y="78" width="48" height="36" rx="4" fill="#fff" opacity=".85"/>`,
      serum: `<ellipse cx="80" cy="26" rx="12" ry="10" fill="${cap}"/><rect x="72" y="32" width="16" height="16" fill="${cap}"/><rect x="54" y="48" width="52" height="96" rx="10" fill="${deep}"/><rect x="60" y="82" width="40" height="34" rx="4" fill="#fff" opacity=".85"/>`,
      milk: `<rect x="36" y="58" width="88" height="22" rx="6" fill="${cap}"/><rect x="40" y="78" width="80" height="62" rx="12" fill="${body}"/><rect x="52" y="94" width="56" height="30" rx="4" fill="#fff" opacity=".85"/>`,
      cleansing: `<rect x="76" y="14" width="8" height="18" fill="${cap}"/><rect x="76" y="14" width="30" height="7" rx="3" fill="${cap}"/><rect x="66" y="30" width="28" height="14" rx="3" fill="${cap}"/><rect x="50" y="42" width="60" height="102" rx="12" fill="${body}"/><rect x="58" y="80" width="44" height="36" rx="4" fill="#fff" opacity=".85"/>`,
      sunscreen: `<path d="M56 30 h48 l-6 104 h-36 z" fill="${body}"/><rect x="60" y="132" width="40" height="14" rx="3" fill="${cap}"/><rect x="62" y="62" width="36" height="38" rx="4" fill="#fff" opacity=".85"/>`,
      base: `<ellipse cx="80" cy="112" rx="50" ry="16" fill="${cap}"/><rect x="30" y="80" width="100" height="32" fill="${cap}"/><ellipse cx="80" cy="80" rx="50" ry="16" fill="${deep}"/><ellipse cx="80" cy="80" rx="30" ry="8" fill="#fff" opacity=".5"/>`
    };
    const textY = { lotion: 100, serum: 103, milk: 113, cleansing: 102, sunscreen: 85, base: 104 }[p.cat] || 100;
    const textFill = p.cat === "base" ? "#fff" : cap;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="${bg}"/>${shapes[p.cat] || shapes.lotion}<text x="80" y="${textY}" font-family="serif" font-size="9" text-anchor="middle" fill="${textFill}">${label}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function detectIngredients(text) {
    return INGS.filter((i) => i.kw.some((k) => text.includes(k))).map((i) => i.id);
  }

  function stars(avg) {
    const full = Math.round(avg * 2) / 2;
    let s = "";
    for (let i = 1; i <= 5; i++) s += i <= full ? "★" : (i - 0.5 === full ? "⯪" : "☆");
    return s;
  }

  // 件数の少ない商品が上位に来すぎないよう、全体平均に寄せた補正スコア
  function weightedScore(avg, count, globalAvg) {
    const C = Number(CFG.SCORE_WEIGHT) || 50;
    return (C * globalAvg + count * avg) / (C + count);
  }

  // ---------- サンプル口コミ生成（シード固定の乱数） ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clampRate = (v) => Math.max(1, Math.min(5, Math.round(v)));

  function buildSamplePosts(products) {
    const rnd = mulberry32(20261102);
    const posts = [];
    products.forEach((p) => {
      if (!p.aff) return;
      const n = 14 + Math.floor(rnd() * 26);
      for (let i = 0; i < n; i++) {
        const skin = SKINS[Math.floor(rnd() * SKINS.length)].id;
        posts.push({ productId: p.id, skin, rating: clampRate(p.aff[skin] + (rnd() - 0.5) * 1.8) });
      }
    });
    (window.COSME_SAMPLE_PAIRS || []).forEach(([a, b, base]) => {
      const n = 5 + Math.floor(rnd() * 12);
      for (let i = 0; i < n; i++) {
        const skin = SKINS[Math.floor(rnd() * SKINS.length)].id;
        posts.push({ productId: a, skin, rating: clampRate(base + (rnd() - 0.5) * 1.4), pairWith: b, pairRating: clampRate(base + (rnd() - 0.5) * 1.6) });
      }
    });
    return posts;
  }

  // ---------- 楽天API ----------
  function rakutenUrl(cat, extra = {}) {
    const params = new URLSearchParams({
      format: "json", formatVersion: "2",
      applicationId: CFG.RAKUTEN_APP_ID, accessKey: CFG.RAKUTEN_ACCESS_KEY,
      keyword: cat.kw, genreId: String(BEAUTY_GENRE_ID),
      sort: "-reviewCount", hits: "30", imageFlag: "1", availability: "1",
      ...extra
    });
    if (CFG.RAKUTEN_AFFILIATE_ID) params.set("affiliateId", CFG.RAKUTEN_AFFILIATE_ID);
    return RAKUTEN_ENDPOINT + "?" + params.toString();
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "__rk" + Date.now() + Math.floor(Math.random() * 1e6);
      const s = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("timeout")); }, 10000);
      function cleanup() { clearTimeout(timer); delete window[cb]; s.remove(); }
      window[cb] = (data) => { cleanup(); resolve(data); };
      s.onerror = () => { cleanup(); reject(new Error("jsonp error")); };
      s.src = url + "&callback=" + cb;
      document.head.appendChild(s);
    });
  }

  async function fetchCategory(cat) {
    const url = rakutenUrl(cat);
    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      data = await res.json();
    } catch (e) {
      data = await jsonp(url); // CORSで弾かれた場合の予備
    }
    if (data && data.error) throw new Error(data.error_description || data.error);
    const items = (data.Items || []).map((it) => it.Item || it);
    return items
      .filter((it) => Number(it.reviewCount) > 0)
      .map((it) => {
        const img = (it.mediumImageUrls || [])[0];
        return {
          id: it.itemCode,
          cat: cat.id,
          maker: detectMaker(it.itemName),
          shop: it.shopName,
          name: it.itemName,
          price: it.itemPrice,
          avg: Number(it.reviewAverage),
          count: Number(it.reviewCount),
          url: it.affiliateUrl || it.itemUrl,
          image: typeof img === "string" ? img : (img && img.imageUrl) || ""
        };
      });
  }

  async function loadRakuten() {
    const cached = store.get(CACHE_KEY);
    const maxAge = (Number(CFG.CACHE_HOURS) || 6) * 3600e3;
    if (cached && Date.now() - cached.at < maxAge && cached.products?.length) return cached.products;

    const all = [];
    for (let i = 0; i < CATS.length; i++) {
      setLoading(`楽天市場のデータを取得中… (${i + 1}/${CATS.length})`);
      all.push(...(await fetchCategory(CATS[i])));
      if (i < CATS.length - 1) await sleep(1100); // 1秒1回の利用制限に合わせる
    }
    // 同じ商品が複数カテゴリに出たときは最初のものを残す
    const seen = new Set();
    const uniq = all.filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
    store.set(CACHE_KEY, { at: Date.now(), products: uniq });
    return uniq;
  }

  // ---------- 集計 ----------
  const allPosts = () => state.samplePosts.concat(state.userPosts);

  function skinStats(productId) {
    const out = {};
    SKINS.forEach((s) => (out[s.id] = { sum: 0, n: 0 }));
    allPosts().forEach((p) => {
      if (p.productId === productId && out[p.skin]) { out[p.skin].sum += p.rating; out[p.skin].n++; }
    });
    return out;
  }

  function pairStats(a, b) {
    let sum = 0, n = 0;
    const bySkin = {};
    allPosts().forEach((p) => {
      if (!p.pairWith || !p.pairRating) return;
      const hit = (p.productId === a && p.pairWith === b) || (p.productId === b && p.pairWith === a);
      if (!hit) return;
      sum += p.pairRating; n++;
      bySkin[p.skin] = bySkin[p.skin] || { sum: 0, n: 0 };
      bySkin[p.skin].sum += p.pairRating; bySkin[p.skin].n++;
    });
    return { avg: n ? sum / n : null, n, bySkin };
  }

  function topPairsFor(id) {
    const map = {};
    allPosts().forEach((p) => {
      if (!p.pairWith || !p.pairRating) return;
      let other = null;
      if (p.productId === id) other = p.pairWith; else if (p.pairWith === id) other = p.productId;
      if (!other || !byId(other)) return;
      map[other] = map[other] || { sum: 0, n: 0 };
      map[other].sum += p.pairRating; map[other].n++;
    });
    return Object.entries(map).map(([oid, v]) => ({ id: oid, avg: v.sum / v.n, n: v.n }))
      .sort((x, y) => y.avg - x.avg);
  }

  function ingredientNotes(a, b) {
    const notes = [];
    const ia = a.ings || [], ib = b.ings || [];
    RULES.forEach((r) => {
      const hit = (ia.includes(r.a) && ib.includes(r.b)) || (ia.includes(r.b) && ib.includes(r.a));
      if (hit) notes.push(r);
    });
    const hasActive = (p) => (p.ings || []).some((x) => x === "retinol" || x === "acid");
    if ((hasActive(a) && b.cat === "sunscreen") || (hasActive(b) && a.cat === "sunscreen")) {
      notes.push({ level: "good", text: "レチノールやピーリング系のアイテムを使う期間は、日中の日焼け止めの併用がよくすすめられています。" });
    }
    if (a.cat === b.cat) {
      notes.push({ level: "tip", text: `どちらも「${catLabel(a.cat)}」です。同じ役割のアイテムを重ねる場合は、量やつける順番を調整しましょう。` });
    }
    return notes;
  }

  // ---------- 描画 ----------
  function setLoading(msg) {
    const el = $("#loading");
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function renderBanner() {
    const el = $("#modeBanner");
    if (state.mode === "rakuten") {
      el.className = "banner ok";
      el.innerHTML = "楽天市場のレビュー件数・平均評価をもとに表示しています。肌質別・併用の評価は、このサイトに投稿された口コミの集計です。";
    } else {
      el.className = "banner";
      el.innerHTML = state.mode === "fallback"
        ? "楽天APIからデータを取得できなかったため、<b>サンプルデータ（架空の商品）</b>で表示しています。設定とWebサイトURLの登録を確認してください。"
        : "現在は<b>サンプルデータ（架空の商品）</b>で表示しています。config.js に楽天APIのキーを入れると実データに切り替わります。";
    }
  }

  function thumb(p) {
    return `<img class="thumb" src="${esc(p.image || sampleImage(p))}" alt="${esc(p.name)}" loading="lazy">`;
  }
  const makerText = (p) => p.maker || "メーカー不明";

  function ingTags(p) {
    return (p.ings || []).map((i) => `<span class="tag">${esc(ingLabel(i))}</span>`).join("");
  }

  function renderCatChips() {
    const chips = [{ id: "all", label: "総合" }].concat(CATS);
    $("#catChips").innerHTML = chips.map((c) =>
      `<button class="chip ${state.cat === c.id ? "on" : ""}" data-cat="${c.id}">${esc(c.label)}</button>`).join("");
  }

  function renderRanking() {
    renderCatChips();
    const list = state.products.filter((p) => state.cat === "all" || p.cat === state.cat);
    const totalN = list.reduce((s, p) => s + p.count, 0);
    const globalAvg = totalN ? list.reduce((s, p) => s + p.avg * p.count, 0) / totalN : 4;
    const ranked = list.map((p) => ({ p, score: weightedScore(p.avg, p.count, globalAvg) }))
      .sort((a, b) => b.score - a.score).slice(0, 30);

    $("#rankList").innerHTML = ranked.length ? ranked.map(({ p, score }, i) => `
      <li class="card rank-card" data-open="${esc(p.id)}">
        <div class="rank-no ${i < 3 ? "top" : ""}">${i + 1}</div>
        ${thumb(p)}
        <div class="body">
          <div class="meta">${esc(catLabel(p.cat))}・${esc(makerText(p))}</div>
          <div class="name">${esc(p.name)}</div>
          <div class="rate"><span class="stars">${stars(p.avg)}</span> ${p.avg.toFixed(2)} <span class="muted">(${p.count.toLocaleString()}件)</span></div>
          <div class="row">
            <span class="price">${yen(p.price)}</span>
            <span class="score">スコア ${score.toFixed(2)}</span>
          </div>
          <div class="tags">${ingTags(p)}</div>
        </div>
      </li>`).join("") : `<li class="empty">該当する商品がありません。</li>`;
  }

  function heat(avg) {
    if (avg == null) return "h0";
    if (avg >= 4.5) return "h5";
    if (avg >= 4.0) return "h4";
    if (avg >= 3.5) return "h3";
    if (avg >= 3.0) return "h2";
    return "h1";
  }

  function renderSkin() {
    $("#skinChips").innerHTML = SKINS.map((s) =>
      `<button class="chip ${state.skin === s.id ? "on" : ""}" data-skin="${s.id}">${esc(s.label)}</button>`).join("");

    const rows = state.products.map((p) => {
      const st = skinStats(p.id)[state.skin];
      return { p, n: st.n, avg: st.n ? st.sum / st.n : null };
    }).filter((r) => r.n >= 3)
      .map((r) => ({ ...r, score: (5 * 3.8 + r.n * r.avg) / (5 + r.n) }))
      .sort((a, b) => b.score - a.score).slice(0, 15);

    $("#skinList").innerHTML = rows.length ? rows.map((r, i) => `
      <li class="card skin-card" data-open="${esc(r.p.id)}">
        <div class="rank-no ${i < 3 ? "top" : ""}">${i + 1}</div>
        <div class="body">
          <div class="meta">${esc(catLabel(r.p.cat))}・${esc(makerText(r.p))}</div>
          <div class="name">${esc(r.p.name)}</div>
          <div class="bar"><span style="width:${(r.avg / 5) * 100}%"></span></div>
          <div class="rate small">${esc(skinLabel(state.skin))}の評価 <b>${r.avg.toFixed(1)}</b> <span class="muted">(${r.n}件)</span></div>
        </div>
      </li>`).join("") : `<li class="empty">${esc(skinLabel(state.skin))}の口コミがまだ3件以上ある商品がありません。口コミ投稿タブから投稿できます。</li>`;
  }

  function productOptions(selected, placeholder) {
    return `<option value="">${esc(placeholder)}</option>` + CATS.map((c) => {
      const items = state.products.filter((p) => p.cat === c.id);
      if (!items.length) return "";
      return `<optgroup label="${esc(c.label)}">` + items.map((p) =>
        `<option value="${esc(p.id)}" ${p.id === selected ? "selected" : ""}>${esc(p.maker ? p.maker + "｜" : "")}${esc(p.name.slice(0, 40))}</option>`).join("") + `</optgroup>`;
    }).join("");
  }

  function renderPairSelects() {
    $("#pairA").innerHTML = productOptions(state.pairA, "1つ目のアイテムを選択");
    $("#pairB").innerHTML = productOptions(state.pairB, "2つ目のアイテムを選択");
  }

  function renderPairResult() {
    const el = $("#pairResult");
    const a = byId(state.pairA), b = byId(state.pairB);
    if (!a || !b) { el.innerHTML = `<p class="muted center">2つのアイテムを選ぶと、併用した人の評価と成分の組み合わせメモが表示されます。</p>`; return; }
    if (a.id === b.id) { el.innerHTML = `<p class="muted center">別々のアイテムを選んでください。</p>`; return; }

    const ps = pairStats(a.id, b.id);
    const notes = ingredientNotes(a, b);
    const icon = { caution: "!", tip: "i", good: "✓" };

    const skinRows = SKINS.map((s) => {
      const v = ps.bySkin[s.id];
      const avg = v ? v.sum / v.n : null;
      return `<div class="cell ${heat(avg)}"><div class="k">${esc(s.label)}</div><div class="v">${avg == null ? "–" : avg.toFixed(1)}</div></div>`;
    }).join("");

    el.innerHTML = `
      <div class="card pair-card">
        <div class="pair-head">
          <div>${thumb(a)}<div class="pname">${esc(a.name)}</div></div>
          <div class="x">×</div>
          <div>${thumb(b)}<div class="pname">${esc(b.name)}</div></div>
        </div>
        <div class="pair-score">
          ${ps.n ? `<div class="big">${ps.avg.toFixed(1)}</div><div class="stars">${stars(ps.avg)}</div><div class="muted">併用した人の評価（${ps.n}件）</div>`
                 : `<div class="muted">この組み合わせの口コミはまだありません。</div>`}
        </div>
        ${ps.n ? `<h4>肌質別</h4><div class="heat">${skinRows}</div>` : ""}
        <h4>成分の組み合わせメモ</h4>
        ${notes.length ? `<ul class="notes">${notes.map((n) => `<li class="note ${n.level}"><span class="ic">${icon[n.level]}</span><span>${esc(n.text)}</span></li>`).join("")}</ul>`
                       : `<p class="muted small">商品名から判断できる、注意が必要な成分の組み合わせは見つかりませんでした。</p>`}
        <p class="fine">成分メモは商品名から推定した一般的な情報です。実際の配合は各商品の表示を確認してください。</p>
      </div>`;
  }

  function renderPostForm() {
    $("#postProduct").innerHTML = productOptions("", "商品を選択");
    $("#postPair").innerHTML = productOptions("", "なし");
    $("#postSkin").innerHTML = SKINS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("");
    renderMyPosts();
  }

  function renderMyPosts() {
    const el = $("#myPosts");
    if (!state.userPosts.length) { el.innerHTML = `<li class="muted small">まだ投稿はありません。</li>`; return; }
    el.innerHTML = state.userPosts.slice().reverse().map((p, idx) => {
      const pr = byId(p.productId), pw = p.pairWith ? byId(p.pairWith) : null;
      const realIdx = state.userPosts.length - 1 - idx;
      return `<li class="mypost">
        <div><b>${esc(pr ? pr.name : "（削除された商品）")}</b></div>
        <div class="small">${esc(skinLabel(p.skin))}・${"★".repeat(p.rating)}${pw ? `／併用：${esc(pw.name.slice(0, 24))} ${"★".repeat(p.pairRating || 0)}` : ""}</div>
        <button class="link" data-del="${realIdx}">削除</button>
      </li>`;
    }).join("");
  }

  // ---------- 商品詳細シート ----------
  function openDetail(id) {
    const p = byId(id);
    if (!p) return;
    const st = skinStats(id);
    const cells = SKINS.map((s) => {
      const avg = st[s.id].n ? st[s.id].sum / st[s.id].n : null;
      return `<div class="cell ${heat(avg)}"><div class="k">${esc(s.label)}</div><div class="v">${avg == null ? "–" : avg.toFixed(1)}</div><div class="n">${st[s.id].n}件</div></div>`;
    }).join("");
    const pairs = topPairsFor(id).slice(0, 4);

    $("#sheetBody").innerHTML = `
      <div class="detail-head">${thumb(p)}
        <div><div class="meta">${esc(catLabel(p.cat))}・${esc(makerText(p))}</div>
        <div class="name">${esc(p.name)}</div>
        <div class="rate"><span class="stars">${stars(p.avg)}</span> ${p.avg.toFixed(2)} <span class="muted">(${p.count.toLocaleString()}件)</span></div>
        <div class="price">${yen(p.price)}</div></div>
      </div>
      <dl class="spec">
        <div><dt>メーカー</dt><dd>${esc(makerText(p))}</dd></div>
        <div><dt>販売ショップ</dt><dd>${esc(p.shop || "–")}</dd></div>
        <div><dt>カテゴリ</dt><dd>${esc(catLabel(p.cat))}</dd></div>
      </dl>
      <div class="tags">${ingTags(p)}</div>
      <h4>肌質別の評価</h4>
      <div class="heat">${cells}</div>
      <h4>相性のよかった組み合わせ</h4>
      ${pairs.length ? `<ul class="pairs">${pairs.map((x) => `<li data-pair="${esc(id)}|${esc(x.id)}"><span>${esc(byId(x.id).name)}</span><b>${x.avg.toFixed(1)}</b></li>`).join("")}</ul>`
                     : `<p class="muted small">まだ併用の口コミがありません。</p>`}
      ${p.url ? `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">楽天市場で見る</a>` : ""}`;
    $("#sheet").hidden = false;
    document.body.classList.add("noscroll");
  }
  function closeDetail() { $("#sheet").hidden = true; document.body.classList.remove("noscroll"); }

  // ---------- タブ ----------
  function showTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== "panel-" + name));
    window.scrollTo({ top: 0 });
  }

  function renderAll() {
    renderBanner();
    renderRanking();
    renderSkin();
    renderPairSelects();
    renderPairResult();
    renderPostForm();
  }

  // ---------- イベント ----------
  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tab],[data-cat],[data-skin],[data-open],[data-pair],[data-del],[data-close]");
      if (!t) return;
      if (t.dataset.tab) showTab(t.dataset.tab);
      else if (t.dataset.cat) { state.cat = t.dataset.cat; renderRanking(); }
      else if (t.dataset.skin) { state.skin = t.dataset.skin; renderSkin(); }
      else if (t.dataset.open) openDetail(t.dataset.open);
      else if (t.dataset.pair) {
        const [a, b] = t.dataset.pair.split("|");
        state.pairA = a; state.pairB = b;
        closeDetail(); renderPairSelects(); renderPairResult(); showTab("pair");
      } else if (t.dataset.del) {
        state.userPosts.splice(Number(t.dataset.del), 1);
        store.set(POSTS_KEY, state.userPosts);
        renderSkin(); renderPairResult(); renderMyPosts();
      } else if (t.dataset.close !== undefined) closeDetail();
    });

    $("#pairA").addEventListener("change", (e) => { state.pairA = e.target.value; renderPairResult(); });
    $("#pairB").addEventListener("change", (e) => { state.pairB = e.target.value; renderPairResult(); });
    $("#swap").addEventListener("click", () => {
      [state.pairA, state.pairB] = [state.pairB, state.pairA];
      renderPairSelects(); renderPairResult();
    });

    $("#postForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const productId = f.product.value;
      const rating = Number(f.rating.value);
      const pairWith = f.pair.value;
      const pairRating = Number(f.pairRating.value);
      const msg = $("#postMsg");
      if (!productId || !rating) { msg.textContent = "商品と評価を選んでください。"; return; }
      if (pairWith && pairWith === productId) { msg.textContent = "併用アイテムには別の商品を選んでください。"; return; }
      if (pairWith && !pairRating) { msg.textContent = "組み合わせの評価も選んでください。"; return; }
      const post = { productId, skin: f.skin.value, rating, at: Date.now() };
      if (pairWith) { post.pairWith = pairWith; post.pairRating = pairRating; }
      state.userPosts.push(post);
      store.set(POSTS_KEY, state.userPosts);
      f.reset();
      msg.textContent = "投稿しました。肌質別・併用チェックに反映されています。";
      renderSkin(); renderPairResult(); renderMyPosts();
    });
  }

  // ---------- 起動 ----------
  async function init() {
    bind();
    state.userPosts = store.get(POSTS_KEY) || [];

    let products = null;
    if (CFG.RAKUTEN_APP_ID && CFG.RAKUTEN_ACCESS_KEY) {
      try { products = await loadRakuten(); state.mode = "rakuten"; }
      catch (err) { console.warn("楽天API取得失敗:", err); state.mode = "fallback"; }
    }
    setLoading("");

    if (!products || !products.length) {
      products = window.COSME_SAMPLE_PRODUCTS.map((p) => ({ ...p, maker: p.brand }));
      state.samplePosts = buildSamplePosts(products);
      if (state.mode === "rakuten") state.mode = "fallback";
    }
    products.forEach((p) => { p.ings = detectIngredients(p.name); });
    state.products = products;

    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
