/* ===========================================================
   share.js — 把一整份简历压进一条 URL

   为什么这么做：学生的痛点是「填完了还要找地方托管才能变成网站」。
   GitHub Pages 要建仓库、Netlify 要拖文件，对不熟的人都是门槛。
   这里换个思路——不托管，把数据本身放进网址：
       https://.../s.html#d=<压缩后的数据>
   谁点开这个链接，页面就地还原成一份网页简历。

   为了压得足够短，做了两件事：
   1) 位置化编码：字段名换成下标，空字段直接砍掉（JSON 里最高频的就是键名和引号）
   2) LZString：URL 安全的字典压缩，中文也能压

   实测一份填满的简历（简介 + 教育 + 2 段实习 + 2 个项目 + 3 组技能 + 2 项荣誉
   + 8 件作品标题）压缩后约 1.1–1.5 KB。
   =========================================================== */
(function (global) {
  'use strict';

  const V = 1;

  /* profile 里参与分享的字段（证件照不进来：一张图就几十 KB，链接会爆） */
  const P_KEYS = ['name', 'jobTitle', 'phone', 'email', 'city', 'website', 'summary'];

  /* 各列表分区的字段顺序 —— 编码时只存值，解码时按下标还原 */
  const LISTS = {
    e: ['school', 'major', 'degree', 'gpa', 'start', 'end', 'detail'],  // education
    x: ['company', 'role', 'start', 'end', 'desc'],                     // experience
    j: ['name', 'role', 'start', 'end', 'link', 'desc'],                // projects
    k: ['group', 'items'],                                             // skills
    a: ['title', 'date', 'issuer', 'desc'],                             // awards
    w: ['title', 'category', 'year', 'desc']                            // works（只留标题信息）
  };

  const NAME_OF = {
    e: 'education', x: 'experience', j: 'projects',
    k: 'skills', a: 'awards', w: 'works'
  };

  const s = v => (v == null ? '' : String(v));

  /** 砍掉行尾的空值 —— 位置化编码里这是最大的一块冗余 */
  function trimTail(row) {
    while (row.length && row[row.length - 1] === '') row.pop();
    return row;
  }

  /* ===========================================================
     pack —— 完整数据 → 极简结构
     =========================================================== */
  function pack(data) {
    const d = data || {};
    const p = d.profile || {};

    const out = { v: V, p: trimTail(P_KEYS.map(k => s(p[k]))) };

    Object.keys(LISTS).forEach(short => {
      const keys = LISTS[short];
      const rows = [];

      (d[NAME_OF[short]] || []).forEach(it => {
        if (!it || typeof it !== 'object') return;
        const row = keys.map(k => {
          // 技能是标签数组，用 | 拼接，比数组字面量省一半
          if (short === 'k' && k === 'items') {
            return (Array.isArray(it.items) ? it.items : []).join('|');
          }
          return s(it[k]);
        });
        trimTail(row);
        if (row.some(v => v !== '')) rows.push(row);
      });

      if (rows.length) out[short] = rows;
    });

    // 作品如果连标题都没有，就没有分享的意义
    if (out.w) {
      out.w = out.w.filter(r => r[0]);
      if (!out.w.length) delete out.w;
    }

    const tpl = d.settings && d.settings.template;
    if (tpl === 'sidebar') out.t = 'sidebar';

    return out;
  }

  /* ===========================================================
     unpack —— 极简结构 → 还原成和本地数据同构的对象
     =========================================================== */
  function unpack(o) {
    const p = o.p || [];

    const data = {
      profile: { name: '', jobTitle: '', phone: '', email: '', city: '', website: '', summary: '', photo: '' },
      education: [], experience: [], projects: [], skills: [], awards: [], works: [],
      settings: {
        template: o.t === 'sidebar' ? 'sidebar' : 'classic',
        portfolio: true,
        portfolioCols: 2,
        portfolioTitle: '作品集',
        siteTitle: ''
      }
    };

    P_KEYS.forEach((k, i) => { data.profile[k] = s(p[i]); });

    Object.keys(LISTS).forEach(short => {
      const keys = LISTS[short];
      const rows = Array.isArray(o[short]) ? o[short] : [];
      data[NAME_OF[short]] = rows.map((row, n) => {
        const it = { id: short + '_' + n };
        keys.forEach((k, i) => { it[k] = s(row[i]); });
        if (short === 'k') {
          it.items = it.items ? it.items.split('|').filter(Boolean) : [];
        }
        return it;
      });
    });

    return data;
  }

  /* ===========================================================
     编码 / 解码
     =========================================================== */
  function encode(data) {
    if (!global.LZString) throw new Error('压缩库未加载');
    return global.LZString.compressToEncodedURIComponent(JSON.stringify(pack(data)));
  }

  function decode(cipher) {
    if (!cipher || !global.LZString) return null;
    let json;
    try {
      json = global.LZString.decompressFromEncodedURIComponent(cipher);
    } catch (e) {
      return null;
    }
    if (!json) return null;
    try {
      const obj = JSON.parse(json);
      return obj && obj.v ? unpack(obj) : null;
    } catch (e) {
      return null;
    }
  }

  /* ===========================================================
     生成链接
     =========================================================== */
  /** 当前站点根目录（保证线上、本地 file://、子路径部署都对） */
  function base() {
    const u = location.href.split('#')[0].split('?')[0];
    return u.replace(/[^/]*$/, '');
  }

  function link(data) {
    return base() + 's.html#d=' + encode(data);
  }

  /** 从 location.hash 里取数据 */
  function fromHash(hash) {
    const h = (hash || location.hash || '').replace(/^#/, '');
    const m = h.match(/(?:^|&)d=(.+)$/);
    return m ? decode(m[1]) : null;
  }

  /* ===========================================================
     可分享性判断
     链接越短越好扫。这里给调用方一个统一的判定口径。
     =========================================================== */
  const LIMIT = {
    print: 200,   // ≤ 200 字符：能印在简历页脚（2cm 二维码可扫）
    screen: 2400  // ≤ 2400 字符：屏幕上扫得动
  };

  function grade(len) {
    if (len <= LIMIT.print) return 'print';
    if (len <= LIMIT.screen) return 'screen';
    return 'too-long';
  }

  global.Share = {
    V, encode, decode, pack, unpack, link, base, fromHash,
    LIMIT, grade,
    get filename() { return 's.html'; }
  };
})(window);
