/* ===========================================================
   util.js — 基础工具
   命名空间：window.U
   =========================================================== */
(function (global) {
  'use strict';

  const U = {};

  /* ---------------- DOM ---------------- */
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  U.el = function (tag, attrs, html) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'dataset') Object.assign(n.dataset, attrs[k]);
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      }
    }
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* ---------------- 字符串 ---------------- */
  U.esc = function (s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** 纯文本 → 段落（保留换行，转义） */
  U.text = function (s) {
    if (!s) return '';
    return U.esc(s).replace(/\n/g, '<br>');
  };

  /** 纯文本 → <li> 列表：按行切分，忽略空行 */
  U.bullets = function (s) {
    if (!s) return [];
    return String(s)
      .split(/\r?\n/)
      .map(t => t.trim())
      .filter(Boolean);
  };

  U.uid = function (prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  };

  /** 判断空内容（用于决定是否渲染某分区） */
  U.has = function (v) {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== '';
  };

  /* ---------------- 日期 ---------------- */
  /**
   * "2023-09" → "2023.09"
   * 传 undefined 的 end 时由调用方决定是否显示"至今"
   */
  U.fmtMonth = function (v) {
    if (!v) return '';
    const m = String(v).match(/^(\d{4})-(\d{1,2})$/);
    if (!m) return String(v);
    return m[1] + '.' + m[2].padStart(2, '0');
  };

  /** 起止时间 → "2023.09 — 2027.06"；end 为空则 "2023.09 — 至今" */
  U.fmtRange = function (start, end, endFallback) {
    const a = U.fmtMonth(start);
    const b = U.fmtMonth(end);
    if (!a && !b) return '';
    if (a && b) return a + ' — ' + b;
    if (a) return a + ' — ' + (endFallback === false ? '' : '至今').trim();
    return b;
  };

  /* ---------------- 通用 ---------------- */
  U.debounce = function (fn, wait) {
    let t = null;
    const d = function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), wait);
    };
    d.cancel = () => clearTimeout(t);
    return d;
  };

  U.clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  U.bytes = function (n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  };

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  U.toast = function (msg, ms) {
    const box = U.$('#toast');
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
    // 强制回流以重启动画
    void box.offsetWidth;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      box.classList.remove('show');
      setTimeout(() => { box.hidden = true; }, 220);
    }, ms || 2400);
  };

  /* ---------------- 文件下载 ---------------- */
  U.download = function (filename, content, mime) {
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = U.el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 800);
  };

  U.readFile = function (file, as) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      as === 'text' ? fr.readAsText(file, 'utf-8') : fr.readAsDataURL(file);
    });
  };

  /* ---------------- 图片压缩 ----------------
     作品图动辄几 MB，必须压。统一填白底转 JPEG，
     避免 PNG 透明区在 canvas 里变黑。
  --------------------------------------------- */
  U.compressImage = function (file, opt) {
    const o = Object.assign({ max: 1400, quality: 0.82, bg: '#ffffff' }, opt || {});
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) {
        return reject(new Error('不是图片文件'));
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        try {
          let w = img.naturalWidth, h = img.naturalHeight;
          const scale = Math.min(1, o.max / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);

          const cv = document.createElement('canvas');
          cv.width = w;
          cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = o.bg;
          ctx.fillRect(0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = cv.toDataURL('image/jpeg', o.quality);
          URL.revokeObjectURL(url);
          resolve({ dataUrl, w, h, bytes: Math.round(dataUrl.length * 0.75) });
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('图片解码失败'));
      };
      img.src = url;
    });
  };

  /* ---------------- 存储层 ----------------
     优先 IndexedDB（容量大，适合存图）；
     file:// 等受限环境自动降级到 localStorage；
     再不行就只在内存里（会提示用户备份）。
  ------------------------------------------- */
  const DB_NAME = 'resume-studio';
  const DB_STORE = 'kv';
  const DB_KEY = 'state-v1';
  let dbPromise = null;
  let storageMode = 'memory'; // 'idb' | 'ls' | 'memory'

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('no idb'));
      let req;
      try {
        req = indexedDB.open(DB_NAME, 1);
      } catch (e) {
        return reject(e);
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('idb open failed'));
      req.onblocked = () => reject(new Error('idb blocked'));
      setTimeout(() => reject(new Error('idb timeout')), 2500);
    }).catch(e => { dbPromise = null; throw e; });
    return dbPromise;
  }

  U.storage = {
    get mode() { return storageMode; },

    async init() {
      try {
        await openDB();
        // 先把模式切过去，否则 set() 会直接返回 false —— 探测就失效了
        storageMode = 'idb';
        await U.storage.set({ __probe: 1 });
        await U.storage.del();
        return storageMode;
      } catch (e) {
        storageMode = 'memory';
        try {
          const probe = '__rs_probe__';
          localStorage.setItem(probe, '1');
          localStorage.removeItem(probe);
          storageMode = 'ls';
        } catch (e2) {
          storageMode = 'memory';
        }
        return storageMode;
      }
    },

    async get() {
      if (storageMode === 'idb') {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readonly');
          const rq = tx.objectStore(DB_STORE).get(DB_KEY);
          rq.onsuccess = () => resolve(rq.result || null);
          rq.onerror = () => reject(rq.error);
        });
      }
      if (storageMode === 'ls') {
        const raw = localStorage.getItem(DB_KEY);
        return raw ? JSON.parse(raw) : null;
      }
      return null;
    },

    async set(obj) {
      if (storageMode === 'idb') {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).put(obj, DB_KEY);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new Error('aborted'));
        });
      }
      if (storageMode === 'ls') {
        localStorage.setItem(DB_KEY, JSON.stringify(obj));
        return true;
      }
      return false;
    },

    async del() {
      if (storageMode === 'idb') {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).delete(DB_KEY);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      }
      if (storageMode === 'ls') localStorage.removeItem(DB_KEY);
      return true;
    }
  };

  /* ---------------- 二维码 ----------------
     依赖 vendor/qrcode.js（qrcode-generator, MIT）
     输出 PNG dataURL，便于下载与嵌入导出的网页
  ------------------------------------------- */
  U.makeQR = function (text, opt) {
    const o = Object.assign({ cell: 8, margin: 4, level: 'M' }, opt || {});
    if (!global.qrcode) throw new Error('QR 库未加载');

    // 自动挑选最小可容纳的版本（1..40）
    let qr = null;
    for (let type = 0; type <= 40; type++) {
      try {
        const t = global.qrcode(type, o.level);
        t.addData(text);
        t.make();
        qr = t;
        break;
      } catch (e) { /* 容量不足，继续加大版本 */ }
      if (type === 0) continue;
    }
    if (!qr) throw new Error('内容过长，无法生成二维码');

    const n = qr.getModuleCount();
    const cell = o.cell;
    const size = (n + o.margin * 2) * cell;

    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + o.margin) * cell, (r + o.margin) * cell, cell, cell);
        }
      }
    }
    return { dataUrl: cv.toDataURL('image/png'), size };
  };

  global.U = U;
})(window);
