/* ===========================================================
   templates.js — 简历 / 作品集版面渲染
   纯函数：数据进，HTML 出。预览与导出共用，保证所见即所得。
   =========================================================== */
(function (global) {
  'use strict';

  const U = global.U;

  const SEC_TITLE = {
    education: '教育经历',
    experience: '实习 / 工作经历',
    projects: '项目经历',
    skills: '技能证书',
    awards: '荣誉奖项'
  };

  /* ---------------- 工具 ---------------- */
  function isEntryEmpty(item, fields) {
    return !fields.some(f => {
      const v = item[f.key];
      if (Array.isArray(v)) return v.length > 0;
      return U.has(v);
    });
  }

  function bulletsHTML(text, cls) {
    const arr = U.bullets(text);
    if (!arr.length) return '';
    return `<ul class="${cls || 'cv-bullets'}">${arr.map(t => `<li>${U.esc(t)}</li>`).join('')}</ul>`;
  }

  function contactItems(p) {
    const out = [];
    if (U.has(p.phone)) out.push({ k: 'tel', v: p.phone });
    if (U.has(p.email)) out.push({ k: 'email', v: p.email });
    if (U.has(p.city)) out.push({ k: 'city', v: p.city });
    if (U.has(p.website)) out.push({ k: 'web', v: p.website.replace(/^https?:\/\//, '') });
    return out;
  }

  /* ---------------- 条目渲染（各列表） ---------------- */
  function eduItem(it, cls) {
    const range = U.fmtRange(it.start, it.end);
    const sub = [it.major, it.degree, it.gpa && 'GPA ' + it.gpa].filter(U.has);
    return `
      <div class="${cls}-item">
        <div class="${cls}-item-head">
          <span class="${cls}-item-title">${U.esc(it.school || '')}</span>
          ${range ? `<span class="${cls}-item-date">${U.esc(range)}</span>` : ''}
        </div>
        ${sub.length ? `<div class="${cls}-item-sub">${sub.map((s, i) => i === 0 ? `<em>${U.esc(s)}</em>` : `<span>${U.esc(s)}</span>`).join('')}</div>` : ''}
        ${bulletsHTML(it.detail, cls + '-bullets')}
      </div>`;
  }

  function expItem(it, cls) {
    const range = U.fmtRange(it.start, it.end);
    return `
      <div class="${cls}-item">
        <div class="${cls}-item-head">
          <span class="${cls}-item-title">${U.esc(it.company || '')}</span>
          ${range ? `<span class="${cls}-item-date">${U.esc(range)}</span>` : ''}
        </div>
        ${U.has(it.role) ? `<div class="${cls}-item-sub"><em>${U.esc(it.role)}</em></div>` : ''}
        ${bulletsHTML(it.desc, cls + '-bullets')}
      </div>`;
  }

  function prjItem(it, cls) {
    const range = U.fmtRange(it.start, it.end);
    return `
      <div class="${cls}-item">
        <div class="${cls}-item-head">
          <span class="${cls}-item-title">${U.esc(it.name || '')}</span>
          ${range ? `<span class="${cls}-item-date">${U.esc(range)}</span>` : ''}
        </div>
        ${U.has(it.role) ? `<div class="${cls}-item-sub"><em>${U.esc(it.role)}</em>${U.has(it.link) ? `<span>${U.esc(it.link)}</span>` : ''}</div>` : ''}
        ${bulletsHTML(it.desc, cls + '-bullets')}
      </div>`;
  }

  function awardItem(it, cls) {
    const d = U.fmtMonth(it.date);
    return `
      <div class="${cls}-item">
        <div class="${cls}-item-head">
          <span class="${cls}-item-title">${U.esc(it.title || '')}</span>
          ${d ? `<span class="${cls}-item-date">${d}</span>` : ''}
        </div>
        ${(U.has(it.issuer) || U.has(it.desc))
          ? `<div class="${cls}-item-sub">${[it.issuer, it.desc].filter(U.has).map(s => `<span>${U.esc(s)}</span>`).join('')}</div>`
          : ''}
      </div>`;
  }

  /* ---------------- 数据清洗：过滤空条目 ---------------- */
  function prep(data) {
    const S = global.SCHEMA;
    const out = {};
    ['education', 'experience', 'projects', 'skills', 'awards', 'works'].forEach(k => {
      const sec = S.find(s => s.id === k);
      const fields = sec ? sec.fields : [];
      out[k] = (data[k] || []).filter(it => !isEntryEmpty(it, fields));
    });
    return out;
  }

  /* ===========================================================
     模板一：经典单栏
     =========================================================== */
  function tplClassic(data, L) {
    const p = data.profile || {};
    const contacts = contactItems(p);

    const secs = [];

    if (U.has(p.summary)) {
      secs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">个人简介</h2>
        <p class="cv-summary">${U.text(p.summary)}</p>
      </section>`);
    }

    if (L.education.length) {
      secs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.education}</h2>
        <div class="cv-sec-body">${L.education.map(it => eduItem(it, 'cv')).join('')}</div>
      </section>`);
    }

    if (L.experience.length) {
      secs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.experience}</h2>
        <div class="cv-sec-body">${L.experience.map(it => expItem(it, 'cv')).join('')}</div>
      </section>`);
    }

    if (L.projects.length) {
      secs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.projects}</h2>
        <div class="cv-sec-body">${L.projects.map(it => prjItem(it, 'cv')).join('')}</div>
      </section>`);
    }

    if (L.skills.length) {
      const rows = L.skills.map(s => `
        <div class="cv-skill-row">
          ${U.has(s.group) ? `<b>${U.esc(s.group)}</b>` : '<b></b>'}
          <span>${(s.items || []).map(U.esc).join(' · ')}</span>
        </div>`).join('');
      secs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.skills}</h2>
        <div class="cv-skills">${rows}</div>
      </section>`);
    }

    if (L.awards.length) {
      secs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.awards}</h2>
        <div class="cv-sec-body">${L.awards.map(it => awardItem(it, 'cv')).join('')}</div>
      </section>`);
    }

    const hasAny = U.has(p.name) || contacts.length || secs.length;

    return `
      <div class="cv">
        <header class="cv-head">
          <div class="cv-head-main">
            <h1 class="cv-name">${U.esc(p.name || '你的姓名')}</h1>
            ${U.has(p.jobTitle) ? `<p class="cv-title">${U.esc(p.jobTitle)}</p>` : ''}
            ${contacts.length ? `<div class="cv-contact">${contacts.map(c => `<span>${U.esc(c.v)}</span>`).join('')}</div>` : ''}
          </div>
          ${p.photo ? `<img class="cv-photo" src="${p.photo}" alt="">` : ''}
        </header>
        ${secs.join('')}
        ${hasAny ? '' : '<div class="empty-hint"><div><strong>左边填，右边看</strong>从「基本信息」开始，填完立刻看到效果</div></div>'}
      </div>`;
  }

  /* ===========================================================
     模板二：双栏侧边
     =========================================================== */
  function tplSidebar(data, L) {
    const p = data.profile || {};
    const contacts = contactItems(p);

    const sideSecs = [];

    if (contacts.length) {
      sideSecs.push(`<div class="cv2-side-sec">
        <h3 class="cv2-side-title">联系方式</h3>
        <div class="cv2-contact">
          ${contacts.map(c => `<div><span class="k">${
            c.k === 'tel' ? '电话' : c.k === 'email' ? '邮箱' : c.k === 'city' ? '城市' : '主页'
          }</span><span>${U.esc(c.v)}</span></div>`).join('')}
        </div>
      </div>`);
    }

    if (L.skills.length) {
      const tags = [];
      L.skills.forEach(s => {
        (s.items || []).forEach(t => tags.push(t));
      });
      if (tags.length) {
        sideSecs.push(`<div class="cv2-side-sec">
          <h3 class="cv2-side-title">技能</h3>
          <div class="cv2-skill-tags">${tags.map(t => `<span>${U.esc(t)}</span>`).join('')}</div>
        </div>`);
      }
    }

    if (L.awards.length) {
      sideSecs.push(`<div class="cv2-side-sec">
        <h3 class="cv2-side-title">荣誉</h3>
        ${L.awards.map(a => `
          <div class="cv2-side-item">
            <b>${U.esc(a.title || '')}</b>
            <span>${[U.fmtMonth(a.date), a.issuer].filter(U.has).map(U.esc).join(' · ')}</span>
          </div>`).join('')}
      </div>`);
    }

    const mainSecs = [];

    if (U.has(p.summary)) {
      mainSecs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">个人简介</h2>
        <p class="cv-summary">${U.text(p.summary)}</p>
      </section>`);
    }
    if (L.education.length) {
      mainSecs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.education}</h2>
        <div class="cv-sec-body">${L.education.map(it => eduItem(it, 'cv')).join('')}</div>
      </section>`);
    }
    if (L.experience.length) {
      mainSecs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.experience}</h2>
        <div class="cv-sec-body">${L.experience.map(it => expItem(it, 'cv')).join('')}</div>
      </section>`);
    }
    if (L.projects.length) {
      mainSecs.push(`<section class="cv-sec">
        <h2 class="cv-sec-title">${SEC_TITLE.projects}</h2>
        <div class="cv-sec-body">${L.projects.map(it => prjItem(it, 'cv')).join('')}</div>
      </section>`);
    }

    return `
      <div class="cv2">
        <aside class="cv2-side">
          ${p.photo ? `<img class="cv2-photo" src="${p.photo}" alt="">` : ''}
          ${sideSecs.join('')}
        </aside>
        <main class="cv2-main">
          <header class="cv2-head">
            <h1 class="cv2-name">${U.esc(p.name || '你的姓名')}</h1>
            ${U.has(p.jobTitle) ? `<p class="cv2-role">${U.esc(p.jobTitle)}</p>` : ''}
          </header>
          ${mainSecs.join('')}
        </main>
      </div>`;
  }

  /* ===========================================================
     作品集页
     单页容量有限，超出自动分页：2 列 4 个/页，3 列 9 个/页
     =========================================================== */
  function portfolioPage(data, opt) {
    const o = opt || {};
    const works = (data.works || []).filter(w => (w.images && w.images.length) || w.title);
    if (!works.length) return '';

    const cols = Number(data.settings && data.settings.portfolioCols) === 3 ? 3 : 2;
    const perPage = cols === 3 ? 9 : 4;
    const title = (data.settings && data.settings.portfolioTitle) || '作品集';
    const name = data.profile.name || '';

    // 切页
    const chunks = [];
    for (let i = 0; i < works.length; i += perPage) {
      chunks.push(works.slice(i, i + perPage));
    }

    return chunks.map((chunk, pageIdx) => {
      const isLast = pageIdx === chunks.length - 1;
      const items = chunk.map(w => {
        const cover = (w.images && w.images[0]) || w.cover || '';
        const meta = [w.category, w.desc].filter(U.has).join(' · ');
        return `
          <div class="pf-item">
            <div class="pf-thumb">
              ${cover ? `<img src="${cover}" alt="${U.esc(w.title || '')}">` : '<span class="pf-empty">NO IMAGE</span>'}
            </div>
            <div class="pf-cap">
              <span class="t">${U.esc(w.title || '未命名作品')}</span>
              ${U.has(w.year) ? `<span class="y">${U.esc(w.year)}</span>` : ''}
            </div>
            ${meta ? `<div class="pf-cap-meta">${U.esc(meta)}</div>` : ''}
          </div>`;
      }).join('');

      return `
        <div class="page portfolio-page">
          <div class="pf">
            <div class="pf-head">
              <div>
                <h2>${U.esc(title)}</h2>
              </div>
              <div class="pf-sub">
                ${U.esc(name)}${U.has(data.profile.jobTitle) ? ' · ' + U.esc(data.profile.jobTitle) : ''}<br>
                共 ${works.length} 件作品${chunks.length > 1 ? ` · 第 ${pageIdx + 1} / ${chunks.length} 页` : ''}
              </div>
            </div>
            <div class="pf-grid cols-${cols}">${items}</div>
            <div class="pf-foot">
              <span>${U.esc(name)}${U.has(data.profile.email) ? ' · ' + U.esc(data.profile.email) : ''}</span>
              ${o.qr && isLast ? `<div class="pf-qr"><span>扫码看动态作品集</span><img src="${o.qr}" alt=""></div>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* ===========================================================
     对外接口
     =========================================================== */
  const Templates = {
    /** 渲染预览的全部页面，返回 { html, pages } */
    renderPreview(data, opt) {
      const o = opt || {};
      const L = prep(data);
      const tpl = (data.settings && data.settings.template) === 'sidebar' ? 'sidebar' : 'classic';

      const resumeInner = tpl === 'sidebar' ? tplSidebar(data, L) : tplClassic(data, L);
      const pages = [];

      pages.push(`<div class="page tpl-${tpl}">${resumeInner}</div>`);

      const showPf = !data.settings || data.settings.portfolio !== false;
      if (showPf) {
        const pf = portfolioPage(data, { qr: o.qr });
        if (pf) pages.push(pf);
      }

      return { html: pages.join(''), pages: pages.length, list: prep(data) };
    },

    /** 只渲染简历（导出用） */
    renderResume(data) {
      const L = prep(data);
      const tpl = (data.settings && data.settings.template) === 'sidebar' ? 'sidebar' : 'classic';
      const inner = tpl === 'sidebar' ? tplSidebar(data, L) : tplClassic(data, L);
      return `<div class="page tpl-${tpl}">${inner}</div>`;
    },

    /** 只渲染作品集（导出用，可能多页） */
    renderPortfolio(data, qr) {
      return portfolioPage(data, { qr });
    },

    prep,
    SEC_TITLE
  };

  global.Templates = Templates;
})(window);
