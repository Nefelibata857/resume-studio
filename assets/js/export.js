/* ===========================================================
   export.js — 导出 PDF / JSON / 个人主页 / 二维码
   =========================================================== */
(function (global) {
  'use strict';

  const U = global.U;

  const Export = {
    /* ---------------- PDF（走系统打印，字体最稳） ---------------- */
    async pdf() {
      const data = global.Store.data;
      const p = data.profile || {};
      const prev = document.title;
      document.title = [p.name, p.jobTitle].filter(U.has).join('-') || '简历';
      U.toast('在打印窗口里选择「另存为 PDF」', 3200);
      await new Promise(r => setTimeout(r, 220));
      global.print();
      setTimeout(() => { document.title = prev; }, 1200);
    },

    /* ---------------- JSON 备份 ---------------- */
    json() {
      const data = global.Store.data;
      const p = data.profile || {};
      const name = (p.name || 'resume').replace(/[\\/:*?"<>|]/g, '');
      const stamp = new Date().toISOString().slice(0, 10);
      U.download(`${name}-简历备份-${stamp}.json`,
        JSON.stringify(data, null, 2), 'application/json');
      U.toast('备份已下载，下次可用「导入」恢复');
    },

    async importFile(file) {
      try {
        const text = await U.readFile(file, 'text');
        const obj = JSON.parse(text);
        if (!obj || typeof obj !== 'object') throw new Error('格式不对');
        global.Store.replace(obj, 'import');
        global.Form.renderAll();
        global.App.refresh();
        U.toast('导入成功');
      } catch (e) {
        console.error(e);
        U.toast('导入失败：文件不是本工具导出的 JSON');
      }
    },

    /* ---------------- 二维码 ----------------
       level 默认 M；分享链接可能上千字符，容量不够时调用方会降到 L
       （L 纠错弱一些，但容量更大，屏幕上扫仍然很稳）
    ------------------------------------------- */
    qr(text, cell, level) {
      return U.makeQR(text, { cell: cell || 8, margin: 3, level: level || 'M' });
    },

    /* ===========================================================
     生成个人主页（单文件、自包含、可直接部署）
     =========================================================== */
    siteHTML(data, opts) {
      const o = opts || {};
      const p = data.profile || {};
      const L = global.Templates.prep(data);

      const name = p.name || '我的主页';
      const pageTitle = (data.settings && data.settings.siteTitle) || [name, p.jobTitle].filter(U.has).join(' · ') || '个人主页';
      const desc = (p.summary || '').replace(/\s+/g, ' ').slice(0, 120);

      /* ---- 作品 ---- */
      const works = (data.works || []).filter(w => (w.images && w.images.length) || w.title);
      const worksHTML = works.length ? works.map(w => {
        const imgs = (w.images && w.images.length ? w.images : (w.cover ? [w.cover] : []));
        const cover = imgs[0] || '';
        return `
        <figure class="work" data-idx="${U.esc(w.id || '')}">
          <div class="work-img">
            ${cover ? `<img src="${cover}" alt="${U.esc(w.title || '')}" loading="lazy">` : '<div class="no-img">NO IMAGE</div>'}
            ${imgs.length > 1 ? `<span class="work-count">${imgs.length}</span>` : ''}
          </div>
          <figcaption>
            <h3>${U.esc(w.title || '未命名作品')}</h3>
            <p>${[w.category, w.year, w.desc].filter(U.has).map(U.esc).join(' · ')}</p>
          </figcaption>
          ${imgs.length > 1 ? `<template data-gallery>${imgs.map(s => `<img src="${s}" alt="">`).join('')}</template>` : ''}
        </figure>`;
      }).join('') : '';

      /* ---- 简历段落 ---- */
      const blocks = [];

      if (L.education.length) {
        blocks.push(`<div class="block">
          <h3 class="block-t">教育经历</h3>
          <div class="block-b">${L.education.map(it => `
            <div class="row">
              <div class="row-main">
                <h4>${U.esc(it.school || '')}</h4>
                <p class="row-sub">${[it.major, it.degree, it.gpa].filter(U.has).map(U.esc).join(' · ')}</p>
                ${it.detail ? `<p class="row-desc">${U.text(it.detail)}</p>` : ''}
              </div>
              <span class="row-date">${U.esc(U.fmtRange(it.start, it.end))}</span>
            </div>`).join('')}</div>
        </div>`);
      }

      if (L.experience.length) {
        blocks.push(`<div class="block">
          <h3 class="block-t">实习 / 工作</h3>
          <div class="block-b">${L.experience.map(it => `
            <div class="row">
              <div class="row-main">
                <h4>${U.esc(it.company || '')}</h4>
                <p class="row-sub">${U.esc(it.role || '')}</p>
                ${it.desc ? `<p class="row-desc">${U.text(it.desc)}</p>` : ''}
              </div>
              <span class="row-date">${U.esc(U.fmtRange(it.start, it.end))}</span>
            </div>`).join('')}</div>
        </div>`);
      }

      if (L.projects.length) {
        blocks.push(`<div class="block">
          <h3 class="block-t">项目经历</h3>
          <div class="block-b">${L.projects.map(it => `
            <div class="row">
              <div class="row-main">
                <h4>${U.esc(it.name || '')}</h4>
                <p class="row-sub">${U.esc(it.role || '')}</p>
                ${it.desc ? `<p class="row-desc">${U.text(it.desc)}</p>` : ''}
              </div>
              <span class="row-date">${U.esc(U.fmtRange(it.start, it.end))}</span>
            </div>`).join('')}</div>
        </div>`);
      }

      if (L.skills.length) {
        blocks.push(`<div class="block">
          <h3 class="block-t">技能证书</h3>
          <div class="block-b">
            ${L.skills.map(s => `<div class="skill-row">
              <span class="skill-k">${U.esc(s.group || '')}</span>
              <span class="skill-v">${(s.items || []).map(t => `<em>${U.esc(t)}</em>`).join('')}</span>
            </div>`).join('')}
          </div>
        </div>`);
      }

      if (L.awards.length) {
        blocks.push(`<div class="block">
          <h3 class="block-t">荣誉奖项</h3>
          <div class="block-b">${L.awards.map(a => `
            <div class="row">
              <div class="row-main">
                <h4>${U.esc(a.title || '')}</h4>
                <p class="row-sub">${[a.issuer, a.desc].filter(U.has).map(U.esc).join(' · ')}</p>
              </div>
              <span class="row-date">${U.esc(U.fmtMonth(a.date))}</span>
            </div>`).join('')}</div>
        </div>`);
      }

      /* ---- 联系方式 ---- */
      const links = [];
      if (U.has(p.email)) links.push(`<a href="mailto:${U.esc(p.email)}">${U.esc(p.email)}</a>`);
      if (U.has(p.phone)) links.push(`<a href="tel:${U.esc(p.phone.replace(/\s/g, ''))}">${U.esc(p.phone)}</a>`);
      if (U.has(p.website)) links.push(`<a href="${U.esc(p.website)}" target="_blank" rel="noopener">${U.esc(p.website.replace(/^https?:\/\//, ''))}</a>`);
      if (U.has(p.city)) links.push(`<span>${U.esc(p.city)}</span>`);

      const css = siteCSS();
      const js = siteJS();

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${U.esc(pageTitle)}</title>
<meta name="description" content="${U.esc(desc)}">
<meta property="og:title" content="${U.esc(pageTitle)}">
<meta property="og:description" content="${U.esc(desc)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%231d4ed8'/><text x='50' y='68' font-size='54' fill='white' text-anchor='middle' font-family='sans-serif'>${U.esc((name[0] || 'R'))}</text></svg>">
<style>${css}</style>
</head>
<body>

<header class="hero">
  <div class="wrap hero-inner">
    <div class="hero-text">
      <h1>${U.esc(name)}</h1>
      ${U.has(p.jobTitle) ? `<p class="role">${U.esc(p.jobTitle)}</p>` : ''}
      ${U.has(p.summary) ? `<p class="bio">${U.text(p.summary)}</p>` : ''}
      ${links.length ? `<div class="links">${links.join('<span class="dot"></span>')}</div>` : ''}
    </div>
    ${p.photo ? `<img class="avatar" src="${p.photo}" alt="${U.esc(name)}">` : ''}
  </div>
</header>

${worksHTML ? `<section class="sec wrap" id="works">
  <div class="sec-head">
    <h2>${U.esc((data.settings && data.settings.portfolioTitle) || '作品集')}</h2>
    <span class="sec-meta">${works.length} 件作品</span>
  </div>
  <div class="works cols-${data.settings && Number(data.settings.portfolioCols) === 3 ? 3 : 2}">${worksHTML}</div>
</section>` : ''}

${blocks.length ? `<section class="sec wrap" id="cv">
  <div class="sec-head">
    <h2>简历</h2>
    <span class="sec-meta">${U.esc(p.jobTitle || '')}</span>
  </div>
  <div class="blocks">${blocks.join('')}</div>
</section>` : ''}

<footer class="wrap foot">
  <span>${U.esc(name)} · ${new Date().getFullYear()}</span>
  <span class="foot-note">由 简历工坊 Resume Studio 生成</span>
</footer>

<div class="lightbox" id="lightbox" hidden>
  <button class="lb-close" aria-label="关闭">✕</button>
  <button class="lb-prev" aria-label="上一张">‹</button>
  <img src="" alt="">
  <button class="lb-next" aria-label="下一张">›</button>
  <div class="lb-count"></div>
</div>

<script>${js}<\/script>
</body>
</html>`;
    },

    /** 生成并下载个人主页 */
    site(data) {
      const p = (data || global.Store.data).profile || {};
      const name = (p.name || 'my-site').replace(/[\\/:*?"<>|]/g, '');
      const html = Export.siteHTML(data || global.Store.data);
      U.download(`${name}-个人主页.html`, html, 'text/html;charset=utf-8');
      U.toast('已下载，下一步：部署上线（看弹层说明）', 4000);
    }
  };

  /* ===========================================================
     个人主页样式
     =========================================================== */
  function siteCSS() {
    return `
*{box-sizing:border-box}
:root{
  --ink:#14181f;--ink2:#3f4854;--muted:#79838f;--line:#e7eaee;
  --accent:#1d4ed8;--bg:#ffffff;--bg2:#f7f8fa;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
}
html{scroll-behavior:smooth}
body{
  margin:0;font-family:var(--sans);color:var(--ink);background:var(--bg);
  font-size:15px;line-height:1.7;-webkit-font-smoothing:antialiased;
}
img{max-width:100%;display:block}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:940px;margin:0 auto;padding:0 24px}

/* hero */
.hero{padding:76px 0 52px;border-bottom:1px solid var(--line)}
.hero-inner{display:flex;gap:40px;align-items:flex-start}
.hero-text{flex:1;min-width:0}
.hero h1{
  margin:0;font-size:clamp(32px,5vw,46px);font-weight:700;letter-spacing:.04em;line-height:1.12;
}
.role{margin:10px 0 0;color:var(--accent);font-weight:600;font-size:14px;letter-spacing:.1em}
.bio{margin:18px 0 0;color:var(--ink2);max-width:56ch;font-size:15px;line-height:1.85}
.links{margin-top:22px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:13.5px}
.links .dot{width:3px;height:3px;border-radius:50%;background:#c8ced6}
.links span{color:var(--muted);font-size:13.5px}
.avatar{
  width:132px;height:168px;object-fit:cover;border-radius:4px;flex-shrink:0;
  border:1px solid var(--line);box-shadow:0 8px 26px rgba(15,23,42,.08)
}

/* section */
.sec{padding:56px 0 8px}
.sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  padding-bottom:14px;border-bottom:1px solid var(--line);margin-bottom:30px}
.sec-head h2{margin:0;font-size:15px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
.sec-meta{font-size:12px;color:var(--muted);letter-spacing:.06em}

/* works */
.works{display:grid;gap:30px}
.works.cols-2{grid-template-columns:repeat(2,1fr)}
.works.cols-3{grid-template-columns:repeat(3,1fr)}
.work{margin:0;cursor:pointer}
.work-img{
  position:relative;aspect-ratio:4/3;background:var(--bg2);overflow:hidden;border-radius:3px;
  border:1px solid var(--line)
}
.work-img img{width:100%;height:100%;object-fit:cover;transition:transform .55s cubic-bezier(.2,.7,.3,1)}
.work:hover .work-img img{transform:scale(1.035)}
.no-img{display:grid;place-items:center;height:100%;color:#c3cad4;font-size:11px;letter-spacing:.14em}
.work-count{
  position:absolute;right:8px;bottom:8px;background:rgba(15,23,42,.72);color:#fff;
  font-size:11px;padding:2px 8px;border-radius:20px;backdrop-filter:blur(4px)
}
.work figcaption{margin-top:11px}
.work h3{margin:0;font-size:14.5px;font-weight:600;letter-spacing:.01em}
.work figcaption p{margin:3px 0 0;font-size:12.5px;color:var(--muted);letter-spacing:.02em}

/* blocks */
.blocks{display:grid;gap:38px}
.block{display:grid;grid-template-columns:132px 1fr;gap:26px;align-items:start}
.block-t{margin:0;font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--muted);padding-top:3px}
.block-b{display:grid;gap:22px;min-width:0}
.row{display:flex;gap:18px;align-items:baseline;justify-content:space-between}
.row-main{flex:1;min-width:0}
.row h4{margin:0;font-size:15px;font-weight:600}
.row-sub{margin:2px 0 0;font-size:13px;color:var(--accent)}
.row-desc{margin:7px 0 0;font-size:13.5px;color:var(--ink2);white-space:pre-line;line-height:1.8}
.row-date{font-size:12px;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums;flex-shrink:0}
.skill-row{display:flex;gap:16px;font-size:13.5px;align-items:baseline}
.skill-k{width:110px;flex-shrink:0;color:var(--ink);font-weight:600;font-size:13px}
.skill-v{display:flex;flex-wrap:wrap;gap:6px}
.skill-v em{
  font-style:normal;background:var(--bg2);border:1px solid var(--line);
  border-radius:3px;padding:2px 9px;font-size:12.5px;color:var(--ink2)
}

/* footer */
.foot{
  margin-top:64px;padding:26px 24px 60px;border-top:1px solid var(--line);
  display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;
  font-size:12px;color:var(--muted);letter-spacing:.04em
}

/* lightbox */
.lightbox{
  position:fixed;inset:0;background:rgba(10,14,20,.94);z-index:999;
  display:flex;align-items:center;justify-content:center;padding:40px
}
.lightbox[hidden]{display:none}
.lightbox img{max-width:92vw;max-height:86vh;object-fit:contain;border-radius:2px}
.lightbox button{
  position:absolute;background:rgba(255,255,255,.1);border:0;color:#fff;
  width:44px;height:44px;border-radius:50%;font-size:20px;cursor:pointer;transition:.15s
}
.lightbox button:hover{background:rgba(255,255,255,.22)}
.lb-close{top:22px;right:22px;font-size:16px}
.lb-prev{left:22px;top:50%;transform:translateY(-50%)}
.lb-next{right:22px;top:50%;transform:translateY(-50%)}
.lb-count{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;letter-spacing:.1em;opacity:.7}

@media(max-width:760px){
  .hero{padding:48px 0 36px}
  .hero-inner{gap:22px}
  .avatar{width:88px;height:112px}
  .works.cols-2,.works.cols-3{grid-template-columns:1fr}
  .block{grid-template-columns:1fr;gap:12px}
  .block-t{padding-top:0}
  .row{flex-direction:column;gap:3px}
  .row-date{order:-1}
  .skill-row{flex-direction:column;gap:5px}
  .skill-k{width:auto}
  .sec{padding:40px 0 6px}
}
`;
  }

  /* ===========================================================
     个人主页交互（灯箱）
     =========================================================== */
  function siteJS() {
    return `
(function(){
  var lb=document.getElementById('lightbox');
  if(!lb)return;
  var img=lb.querySelector('img'),cnt=lb.querySelector('.lb-count');
  var list=[],idx=0;
  function show(){
    if(!list.length)return;
    img.src=list[idx];cnt.textContent=(idx+1)+' / '+list.length;
    lb.hidden=false;document.body.style.overflow='hidden';
  }
  function hide(){lb.hidden=true;document.body.style.overflow='';}
  function go(d){idx=(idx+d+list.length)%list.length;show();}
  document.querySelectorAll('.work').forEach(function(fig){
    fig.addEventListener('click',function(){
      var tpl=fig.querySelector('template[data-gallery]');
      var one=fig.querySelector('.work-img img');
      list=tpl?Array.prototype.map.call(tpl.content.querySelectorAll('img'),function(i){return i.getAttribute('src')})
               :(one?[one.getAttribute('src')]:[]);
      idx=0;show();
    });
  });
  lb.querySelector('.lb-close').addEventListener('click',hide);
  lb.querySelector('.lb-prev').addEventListener('click',function(e){e.stopPropagation();go(-1)});
  lb.querySelector('.lb-next').addEventListener('click',function(e){e.stopPropagation();go(1)});
  lb.addEventListener('click',function(e){if(e.target===lb)hide()});
  document.addEventListener('keydown',function(e){
    if(lb.hidden)return;
    if(e.key==='Escape')hide();
    if(e.key==='ArrowLeft')go(-1);
    if(e.key==='ArrowRight')go(1);
  });
})();
`;
  }

  global.Export = Export;
})(window);
