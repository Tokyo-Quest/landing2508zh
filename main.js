/**
 * Tokyo Quest LP scripts
 * - Lazy-load images (data-src)
 * - Minor glitch flicker on hover for headings
 * - Respect-reduced-motion
 * - Auto sliding strip under hero (3-up view, center card emphasized)
 * - Swap hero image note: ensure ./assets/hero.jpg exists (copy from Downloads as instructed)
 */
 
(function () {
  const doc = document;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lazy load images with data-src using IntersectionObserver
  const lazyImgs = Array.from(doc.querySelectorAll("img.lazy[data-src]"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const img = e.target;
          const src = img.getAttribute("data-src");
          if (src) {
            img.src = src;
            img.removeAttribute("data-src");
          }
          img.addEventListener("load", () => {
            img.classList.add("loaded");
          }, { once: true });
          obs.unobserve(img);
        }
      }
    }, { rootMargin: "200px 0px", threshold: 0.01 });
    lazyImgs.forEach(el => io.observe(el));
  } else {
    // Fallback: eager-set src
    lazyImgs.forEach(img => {
      const src = img.getAttribute("data-src");
      if (src) img.src = src;
      img.removeAttribute("data-src");
    });
  }

  // Minor glitch flicker on hover for .glitch (adds/removes a class)
  if (!prefersReduced) {
    const glitches = doc.querySelectorAll(".glitch");
    glitches.forEach(el => {
      let t;
      el.addEventListener("mouseenter", () => {
        clearTimeout(t);
        el.classList.add("glitching");
        // auto stop after a short burst
        t = setTimeout(() => el.classList.remove("glitching"), 600);
      });
      el.addEventListener("mouseleave", () => {
        clearTimeout(t);
        el.classList.remove("glitching");
      });
    });
  }

  // Attach tracking data attribute to CTA clicks (lightweight)
  const ctas = doc.querySelectorAll("[data-cta]");
  ctas.forEach(a => {
    a.addEventListener("click", () => {
      // Here you could integrate analytics; we only mark a dataset flag.
      a.dataset.clicked = "1";
    }, { passive: true });
  });

  // Auto sliding strip logic
  const viewport = doc.querySelector(".strip-viewport");
  const track = doc.querySelector(".strip-track");
  if (viewport && track && !prefersReduced) {
    let cards = Array.from(track.querySelectorAll(".strip-card"));
    // Ensure at least 6 items; if less, clone to loop smoothly
    while (track.children.length < 6 && cards.length) {
      track.appendChild(cards[track.children.length % cards.length].cloneNode(true));
    }
    // Re-query after potential cloning
    cards = Array.from(track.querySelectorAll(".strip-card"));

    // 初期並びをユーザー報告の期待に合わせて固定
    // 期待: 初回レンダ時に中央=slide-spot-05.webp、右に 06, 01 ... と続く
    // 対処: 画像ファイル名を読み取り、[05,06,01,02,03,04] の順に並び替えたうえで
    //       「index 0 を中央に合わせる」センタリングに切り替える。
    const desired = ["slide-spot-05.webp","slide-spot-06.webp","slide-spot-01.webp","slide-spot-02.webp","slide-spot-03.webp","slide-spot-04.webp"];
    const filenameOf = (li) => {
      const img = li.querySelector("img");
      if (!img) return "";
      const src = img.getAttribute("src") || "";
      try {
        const u = new URL(src, location.href);
        return u.pathname.split("/").pop() || "";
      } catch {
        return src.split("/").pop() || "";
      }
    };
    const ordered = Array.from(track.children).slice().sort((a,b) => {
      const ai = desired.indexOf(filenameOf(a));
      const bi = desired.indexOf(filenameOf(b));
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    if (ordered.some((el, i) => el !== track.children[i])) {
      ordered.forEach(el => track.appendChild(el));
    }

    // 初期表示は「05を左端に固定して始める」に変更
    // 見え順: [05(left), 06, 01, 02, 03, 04]。以後は左へ1カード分ずつスライドして循環。
    const wantOrder = ["slide-spot-05.webp","slide-spot-06.webp","slide-spot-01.webp","slide-spot-02.webp","slide-spot-03.webp","slide-spot-04.webp"];
    const pickName = el => {
      const img = el.querySelector("img");
      if (!img) return "";
      try {
        const u = new URL(img.getAttribute("src"), location.href);
        return u.pathname.split("/").pop() || "";
      } catch {
        const src = img.getAttribute("src") || "";
        return src.split("/").pop() || "";
      }
    };
    // 現在のカードをファイル名で評価して、上記の望ましい順序で並べ替える
    const current = Array.from(track.children);
    const sorted = current.slice().sort((a,b) => {
      const an = pickName(a);
      const bn = pickName(b);
      const ai = wantOrder.indexOf(an);
      const bi = wantOrder.indexOf(bn);
      // 未知の要素は末尾へ
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    // 並べ替えを適用（既存と差がある場合のみ）
    if (sorted.some((el, i) => el !== track.children[i])) {
      sorted.forEach(el => track.appendChild(el));
    }
    // 以降のロジックは「index 0 が中央候補」で動作する（初動の DOM スワップは不要）

    // Compute widths
    const gap = parseFloat(getComputedStyle(track).getPropertyValue("gap")) || 12;
    const getCardWidth = () => track.querySelector(".strip-card")?.getBoundingClientRect().width || 280;

    // Center emphasis helper: pick the card closest to the viewport center
    const updateCenterEmphasis = () => {
      const vpRect = viewport.getBoundingClientRect();
      const vpCenter = vpRect.left + vpRect.width / 2;
      let best = { el: null, dist: Infinity, idx: -1 };

      const cardsEls = Array.from(track.querySelectorAll(".strip-card"));
      cardsEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const d = Math.abs(center - vpCenter);
        if (d < best.dist) best = { el, dist: d, idx: i };
        el.classList.remove("is-center");
      });
      if (best.el) {
        best.el.classList.add("is-center");
      }

      // 自動スライドの開始位置は「05を左端」で良いが、
      // 強調表示対象（is-center）は常に画面中央に来るようスナップさせる。
      // これによりビューポート幅（レスポンシブ）に応じて、中央に最も近いカードが正確に中央へ寄る。
      if (best.idx !== -1) {
        const cardW = getCardWidth();
        const targetX = (vpRect.width - cardW) / 2;
        // best.el の現在の左座標
        const currentLeft = best.el.getBoundingClientRect().left - vpRect.left;
        const delta = targetX - currentLeft;
        // 現在の transform X を取得
        const m = track.style.transform.match(/translateX\\((-?\\d+(?:\\.\\d+)?)px\\)/);
        const curX = m ? parseFloat(m[1]) : 0;
        // 小さな誤差だけ動かす（ユーザー操作やアニメ直後にも対応）
        track.style.transition = "transform 180ms ease-out";
        track.style.transform = `translateX(${curX + delta}px)`;
      }
    };

    // 左端固定: 先頭カード（05）の左端が viewport 左端に一致するオフセット
    const computeLeftEdgeOffset = () => {
      // track は translateX(0) で先頭カードの左端がちょうど viewport 左端に来るようにする。
      // gap は track 内のカード間ギャップなので、左端固定では 0px を戻す。
      return 0;
    };

    // No fade-out: we use pure slide-out. Helper retained (no-op) for compatibility.
    const markExitingLeft = () => {};

    // タイミング管理
    let animTimer = null;

    const step = () => {
      const w = getCardWidth();
      const leftOffset = computeLeftEdgeOffset();

      // 1) 停止位置（左端=05の左端を viewport 左端に）から開始
      track.style.transition = "transform 0ms";
      track.style.transform = `translateX(${leftOffset}px)`;

      // 2) 左へ1カード分だけ移動
      requestAnimationFrame(() => {
        track.style.transition = "transform 700ms ease";
        track.style.transform = `translateX(${leftOffset - (w + gap)}px)`;
      });

      // 3) アニメ完了後に先頭を末尾へ→左端位置に瞬時復帰
      setTimeout(() => {
        track.style.transition = "none";
        track.style.transform = `translateX(${leftOffset - (w + gap) - 1}px)`;

        requestAnimationFrame(() => {
          if (track.children.length) {
            track.appendChild(track.firstElementChild);
          }
          track.style.transform = `translateX(${leftOffset}px)`;
          // 中央強調は「最も中心に近いカード」に付く。左端開始でも視覚的中心を示すため維持。
          requestAnimationFrame(updateCenterEmphasis);
        });
      }, 720);
    };

    // 初期化: 並べ替え済（05 が index 0）なので、DOM の先頭移動は行わない

    // 初期配置: 左端固定（05 が左端に見える）
    track.style.transition = "none";
    track.style.transform = `translateX(${computeLeftEdgeOffset()}px)`;
    // 強調はフレーム跨ぎで計算し、必要なら中央にスナップ
    requestAnimationFrame(updateCenterEmphasis);

    // タイマー開始（元の周期に復帰）
    animTimer = setInterval(step, 2500);

    // Pause on hover/focus for accessibility
    const stop = () => { if (animTimer) { clearInterval(animTimer); animTimer = null; } };
    const start = () => { if (!animTimer) animTimer = setInterval(step, 2500); };
    viewport.addEventListener("mouseenter", stop);
    viewport.addEventListener("mouseleave", start);
    viewport.addEventListener("focusin", stop);
    viewport.addEventListener("focusout", start);
    // Mobile touch: stop while user is swiping, restart after
    viewport.addEventListener("touchstart", stop, { passive: true });
    viewport.addEventListener("touchend", start, { passive: true });
    viewport.addEventListener("touchcancel", start, { passive: true });

    // On resize, re-evaluate and snap the emphasized card back to true center
    window.addEventListener("resize", () => {
      clearTimeout(window.__stripRaf);
      window.__stripRaf = setTimeout(() => {
        // 位置は一旦維持（現在の translateX を保ちつつ）
        track.style.transition = "none";
        // 次フレームで中央に最も近いカードへスナップ
        requestAnimationFrame(updateCenterEmphasis);
      }, 120);
    });
  }

  // ===== Phase 1: Mobile-first subtle effects =====
  // Save-Data hint: tone down effects
  if (navigator.connection && navigator.connection.saveData) {
    document.documentElement.classList.add("save-data");
  }

  // 1) Hero micro parallax (touch/mouse). Reduced motion => skip.
  if (!prefersReduced) {
    const hero = doc.querySelector(".hero.hero--top");
    const bg = doc.querySelector(".hero-bg");
    const ov = doc.querySelector(".hero-overlay");
    if (hero && bg && ov) {
      let isTouching = false;
      const setVar = (x, y) => {
        // Normalize to [-1,1]
        const nx = Math.max(-1, Math.min(1, x));
        const ny = Math.max(-1, Math.min(1, y));
        hero.style.setProperty("--mx", nx);
        hero.style.setProperty("--my", ny);
      };
      // Mouse (desktop)
      hero.addEventListener("mousemove", (e) => {
        if (isTouching) return;
        const r = hero.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        setVar(x * 0.6, y * 0.6);
      });
      // Touch (mobile) - only while touching
      hero.addEventListener("touchstart", (e) => {
        isTouching = true;
        const t = e.touches[0];
        const r = hero.getBoundingClientRect();
        const x = ((t.clientX - r.left) / r.width) * 2 - 1;
        const y = ((t.clientY - r.top) / r.height) * 2 - 1;
        setVar(x, y);
      }, { passive: true });
      hero.addEventListener("touchmove", (e) => {
        const t = e.touches[0];
        if (!t) return;
        const r = hero.getBoundingClientRect();
        const x = ((t.clientX - r.left) / r.width) * 2 - 1;
        const y = ((t.clientY - r.top) / r.height) * 2 - 1;
        setVar(x, y);
      }, { passive: true });
      hero.addEventListener("touchend", () => {
        isTouching = false;
        // Ease back to center
        hero.style.setProperty("--mx", 0);
        hero.style.setProperty("--my", 0);
      }, { passive: true });
      hero.addEventListener("touchcancel", () => {
        isTouching = false;
        hero.style.setProperty("--mx", 0);
        hero.style.setProperty("--my", 0);
      }, { passive: true });
    }
  }

  // 2) Section title scan sweep: run once when visible
  (() => {
    const titles = Array.from(doc.querySelectorAll(".section-title"));
    if (!titles.length) return;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target;
            el.classList.add("scanned");
            obs.unobserve(el);
          }
        }
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.2 });
      titles.forEach(el => io.observe(el));
    } else {
      titles.forEach(el => el.classList.add("scanned"));
    }
  })();

  // 3) Neon button ripple: inject click/tap position as CSS vars
  (() => {
    const btns = Array.from(doc.querySelectorAll(".btn.neon"));
    const setRipple = (el, x, y) => {
      const r = el.getBoundingClientRect();
      const rx = ((x - r.left) / r.width) * 100;
      const ry = ((y - r.top) / r.height) * 100;
      el.style.setProperty("--rx", rx + "%");
      el.style.setProperty("--ry", ry + "%");
      el.dataset.rippling = "1";
      // retrigger quickly
      setTimeout(() => { delete el.dataset.rippling; }, 240);
    };
    btns.forEach(el => {
      el.addEventListener("click", (ev) => {
        const p = ev.touches?.[0] || ev;
        setRipple(el, p.clientX, p.clientY);
      }, { passive: true });
      el.addEventListener("touchstart", (ev) => {
        const t = ev.touches[0];
        if (t) setRipple(el, t.clientX, t.clientY);
      }, { passive: true });
    });
  })();
+
  // Warn in console if hero image is missing (helpful during setup)
  window.addEventListener("load", () => {
    const hero = doc.querySelector(".hero-bg");
    if (hero && hero.currentSrc) {
      // Ok
    } else {
      // eslint-disable-next-line no-console
      console.warn("Ensure ./assets/hero.jpg exists. If missing, copy your hero.jpg into landing3/assets/hero.jpg");
    }
  });
})();
/* scroll progress setup */
(function(){
  var bar = document.querySelector('.progress-bar');
  if(!bar){
    bar = document.createElement('div');
    bar.className = 'progress-bar';
    document.body.appendChild(bar);
  }
  function getScrollTop(){
    return window.pageYOffset || (document.scrollingElement && document.scrollingElement.scrollTop) ||
           document.documentElement.scrollTop || document.body.scrollTop || 0;
  }
  function getDocHeight(){
    var b = document.body, e = document.documentElement;
    return Math.max(b.scrollHeight, e.scrollHeight, b.offsetHeight, e.offsetHeight, b.clientHeight, e.clientHeight);
  }
  function update(){
    var st = getScrollTop();
    var h = getDocHeight();
    var win = window.innerHeight || document.documentElement.clientHeight || 1;
    var max = Math.max(1, h - win);
    var pct = Math.min(1, st / max);
    bar.style.width = (pct * 100) + '%';
  }
  ['scroll','resize','orientationchange','load'].forEach(function(evt){
    window.addEventListener(evt, update, {passive:true});
  });
  update();
})();

/* removed duplicate scroll progress setup */


/* center-snap padding recalculation（画面幅に応じて中央止まりを安定化） */
(function(){
  function centerSnap(el, itemSel){
    if(!el) return;
    var item = el.querySelector(itemSel);
    if(!item) return;
    var vw = window.innerWidth;
    var cw = item.getBoundingClientRect().width;
    var pad = Math.max(0, (vw - cw)/2);
    el.style.setProperty('--sp', pad + 'px'); // CSSの scroll-padding-inline に反映
  }
  function apply(){
    centerSnap(document.querySelector('#how .how-screens .spots-scroller'), '.screen-frame, .spot-card');
    // （Featured Spots を使う場合は↓も維持）
    centerSnap(document.querySelector('#featured .spots-scroller'), '.spot-card, .route-card');
  }
  window.addEventListener('resize', apply, {passive:true});
  window.addEventListener('orientationchange', apply, {passive:true});
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', apply); } else { apply(); }
})();
