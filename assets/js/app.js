/* ===========================================================
   app.js — 主控：装配、预览、缩放、弹层
   =========================================================== */
(function (global) {
  'use strict';

  const U = global.U;

  const App = {
    _zoom: 1,
    _qrCache: {},
    _lastHTML: '',
    _renderPending: false,

    /* ================= 启动 ================= */
    async init() {
      const mode = await global.Store.init();

      global.Form.mount(U.$('#formRoot'));
      global.Store.on(() => this.scheduleRender());

      this.bindTop();
      this.bindZoom();
      this.bindModal();
      this.bindKeyboard();

      this.refresh();
      this.updateTemplateSeg();

      // 存储不可用时的提示
      if (mode === 'memory') {
        U.toast('当前环境无法本地保存，请及时用「备份」导出文件', 5000);
      }

      // 首次访问引导
      const d = global.Store.data;
      const isEmpty = !U.has(d.profile.name) && !d.education.length && !d.experience.length;
      if (isEmpty) {
        setTimeout(() => U.toast('不知道从哪开始？点顶部「载入示例」看看效果', 4200), 900);
      }

      // 适应宽度
      requestAnimationFrame(() => this.fitZoom());
    },

    /* ================= 预览渲染 ================= */
    scheduleRender() {
      if (this._renderPending) return;
      this._renderPending = true;
      setTimeout(() => {
        this._renderPending = false;
        this.refresh();
      }, 150);
    },

    refresh() {
      const data = global.Store.data;
      const qr = this.qrFor(data.profile.website);

      const res = global.Templates.renderPreview(data, { qr });
      const mount = U.$('#paperMount');
      if (!mount) return;

      if (res.html !== this._lastHTML) {
        mount.innerHTML = res.html;
        this._lastHTML = res.html;
      }

      // 测量实际页数
      requestAnimationFrame(() => this.measurePages());
    },

    measurePages() {
      const wrap = U.$('#paperWrap');
      const info = U.$('#pageInfo');
      if (!wrap || !info) return;

      const z = parseFloat(getComputedStyle(wrap).zoom) || 1;
      let total = 0;
      let resumePages = 0;

      const pages = U.$$('.page', wrap);
      pages.forEach((pg, i) => {
        const h = pg.offsetHeight / z;
        const n = Math.max(1, Math.ceil(h / 1123 - 0.02));
        total += n;
        if (i === 0) resumePages = n;
      });

      if (!pages.length) {
        info.textContent = 'A4 · —';
        info.style.color = '';
        return;
      }

      if (resumePages > 1) {
        info.textContent = `A4 · 简历占 ${resumePages} 页，建议精简`;
        info.style.color = '#b45309';
      } else {
        info.textContent = `A4 · 共 ${total} 页`;
        info.style.color = '';
      }
    },

    qrFor(url) {
      if (!U.has(url)) return '';
      const key = String(url).trim();
      if (this._qrCache[key]) return this._qrCache[key];
      try {
        const r = global.Export.qr(key, 6);
        this._qrCache[key] = r.dataUrl;
        return r.dataUrl;
      } catch (e) {
        console.warn('二维码生成失败', e);
        return '';
      }
    },

    /* ================= 顶栏 ================= */
    bindTop() {
      // 模板切换
      U.$('#templateSwitch').addEventListener('click', e => {
        const b = e.target.closest('.seg-btn');
        if (!b) return;
        global.Store.data.settings.template = b.dataset.template;
        global.Store.touch('template');
        this.updateTemplateSeg();
      });

      U.$('#btnPdf').addEventListener('click', () => global.Export.pdf());
      U.$('#btnExportJson').addEventListener('click', () => global.Export.json());

      U.$('#btnImport').addEventListener('click', () => U.$('#fileImport').click());
      U.$('#fileImport').addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (f) global.Export.importFile(f);
      });

      U.$('#btnDemo').addEventListener('click', () => {
        const hasData = U.has(global.Store.data.profile.name) ||
          ['education', 'experience', 'projects', 'works'].some(k => global.Store.data[k].length);
        if (hasData && !confirm('载入示例会覆盖当前内容，确定继续？\n（建议先点「备份」）')) return;
        global.Store.replace(global.DATA.demo(), 'demo');
        global.Form.renderAll();
        this.refresh();
        this.updateTemplateSeg();
        U.toast('示例已载入，随便改，不会影响别人');
      });

      U.$('#btnReset').addEventListener('click', () => {
        if (!confirm('确定清空全部内容？此操作不可撤销。\n图片也会一并删除。')) return;
        global.Store.replace(global.DATA.blank(), 'reset');
        global.Form.renderAll();
        this.refresh();
        this.updateTemplateSeg();
        U.toast('已清空');
      });

      // 发布网站
      U.$('#btnSite').addEventListener('click', () => this.openPublish());

      // 二维码
      U.$('#btnQr').addEventListener('click', () => this.openQrModal());
    },

    updateTemplateSeg() {
      const tpl = global.Store.data.settings.template || 'classic';
      U.$$('#templateSwitch .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.template === tpl);
      });
    },

    /* ================= 缩放 ================= */
    bindZoom() {
      U.$('#zoomIn').addEventListener('click', () => this.setZoom(this._zoom + 0.1));
      U.$('#zoomOut').addEventListener('click', () => this.setZoom(this._zoom - 0.1));
      U.$('#zoomFit').addEventListener('click', () => this.fitZoom());

      // Ctrl + 滚轮
      U.$('#stageScroll').addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.setZoom(this._zoom + (e.deltaY < 0 ? 0.06 : -0.06));
      }, { passive: false });

      this.setZoom(1);
    },

    setZoom(z) {
      this._zoom = U.clamp(Math.round(z * 100) / 100, 0.4, 1.6);
      const wrap = U.$('#paperWrap');
      if (wrap) wrap.style.setProperty('--zoom', this._zoom);
      const lab = U.$('#zoomVal');
      if (lab) lab.textContent = Math.round(this._zoom * 100) + '%';
      this.measurePages();
    },

    fitZoom() {
      const sc = U.$('#stageScroll');
      if (!sc) return;
      // 扣掉预览区左右 padding、竖向滚动条和一点呼吸空间
      const avail = sc.clientWidth - 80;
      if (avail < 200) return;
      this.setZoom(U.clamp(avail / 794, 0.4, 1.4));
    },

    /* ================= 弹层 ================= */
    bindModal() {
      const mask = U.$('#modalMask');
      U.$('#modalClose').addEventListener('click', () => this.closeModal());
      mask.addEventListener('click', e => {
        if (e.target === mask) this.closeModal();
      });
    },

    openModal(opt) {
      const mask = U.$('#modalMask');
      const box = U.$('#modalBox');
      if (box) box.classList.toggle('wide', !!opt.wide);
      U.$('#modalTitle').textContent = opt.title || '';
      U.$('#modalBody').innerHTML = opt.body || '';
      U.$('#modalFoot').innerHTML = opt.foot || '';
      mask.hidden = false;
      if (typeof opt.after === 'function') opt.after();
    },

    closeModal() {
      const box = U.$('#modalBox');
      if (box) box.classList.remove('wide');
      U.$('#modalMask').hidden = true;
    },

    /* ---------------- 二维码弹层 ---------------- */
    openQrModal() {
      const d = global.Store.data;
      const preset = d.profile.website || '';

      this.openModal({
        title: '生成二维码',
        body: `
          <div class="field" style="margin-bottom:16px">
            <label for="qrUrl">你的主页地址</label>
            <input type="text" id="qrUrl" placeholder="https://你的用户名.github.io/resume-studio"
                   value="${U.esc(preset)}">
            <div class="hint">
              先点顶部「发布网站」拿到网址 —— 在线链接或部署好的主页都行，填到这里。
              填完会自动同步到「个人主页 / 作品链接」，作品集 PDF 页脚也会带上这个二维码。
            </div>
          </div>
          <div id="qrBox"></div>
        `,
        foot: `
          <button class="mbtn" data-close>关闭</button>
          <button class="mbtn mbtn-primary" id="qrDownload" disabled>下载 PNG</button>
        `,
        after: () => {
          const input = U.$('#qrUrl');
          const box = U.$('#qrBox');
          const dl = U.$('#qrDownload');
          let current = null;

          const paint = () => {
            const url = input.value.trim();
            if (!url) {
              box.innerHTML = '<div class="hint" style="text-align:center;padding:26px 0">填入网址后，这里会显示二维码</div>';
              dl.disabled = true;
              current = null;
              return;
            }
            try {
              const r = global.Export.qr(url, 8);
              current = r;
              box.innerHTML = `
                <div class="qr-result">
                  <div class="qr-canvas-box"><img src="${r.dataUrl}" alt="二维码"></div>
                  <div class="qr-side">
                    <div class="qr-url">${U.esc(url)}</div>
                    <div class="hint">扫码即可打开你的作品集主页，适合印在简历、作品集页脚、名片上。</div>
                    <div class="hint">建议尺寸：打印不小于 2cm × 2cm。</div>
                  </div>
                </div>`;
              dl.disabled = false;
              // 同步到个人主页字段
              if (global.Store.data.profile.website !== url) {
                global.Store.data.profile.website = url;
                global.Store.touch('qr');
                const wf = U.$('[data-field="website"] input', U.$('#formRoot'));
                if (wf) wf.value = url;
              }
            } catch (e) {
              box.innerHTML = '<div class="hint" style="color:#dc2626">网址太长，无法生成二维码</div>';
              dl.disabled = true;
              current = null;
            }
          };

          input.addEventListener('input', U.debounce(paint, 260));
          paint();

          U.$('#modalFoot').querySelector('[data-close]').addEventListener('click', () => this.closeModal());
          dl.addEventListener('click', () => {
            if (!current) return;
            const name = (global.Store.data.profile.name || 'me').replace(/[\\/:*?"<>|]/g, '');
            const a = U.el('a', { href: current.dataUrl, download: `${name}-二维码.png` });
            document.body.appendChild(a);
            a.click();
            a.remove();
            U.toast('二维码已下载');
          });
        }
      });
    },

    /* ================= 发布中心 =================
       两条路：
         ① 在线链接 —— 数据压进网址，点一下就有页面，不用托管
         ② 完整网页 —— 单文件 html，下载后拖到任意免费托管
       前者解决「不想折腾」，后者解决「要放作品图」。
       ============================================ */
    openPublish() {
      const d = global.Store.data;

      if (!U.has(d.profile.name)) {
        U.toast('先填个姓名吧，网站总得有个名字');
        const el = U.$('[data-section="profile"]');
        if (el) { el.open = true; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }

      this.openModal({
        wide: true,
        title: '把这份简历变成网站',
        body: `
          <div class="pub-tabs" role="tablist">
            <button class="pub-tab active" data-tab="online" role="tab">
              <b>在线链接</b>
              <span>点一下就有网址，不用注册、不用上传</span>
            </button>
            <button class="pub-tab" data-tab="site" role="tab">
              <b>完整网页</b>
              <span>带作品图，下载后托管，一分钟上线</span>
            </button>
          </div>

          <div class="pub-pane" data-pane="online">
            <ul class="pub-facts">
              <li>简历内容被压缩进网址本身，<b>不需要服务器，也不需要上传</b>。</li>
              <li>生成即可用：链接发给 HR，或让对方扫码打开，手机上排版是自适应的。</li>
              <li>只带文字（简历 + 作品目录）。要展示作品图，切到「完整网页」。</li>
            </ul>
            <button class="btn btn-primary pub-go" id="pubGen">生成在线链接</button>
            <div id="pubOnlineOut"></div>
          </div>

          <div class="pub-pane" data-pane="site" hidden>
            <p class="pub-lead">
              下载一个单文件网页 —— 图片全部内嵌，不依赖任何外部资源。
              放到任意免费托管上，就是你的独立网站，网址也短，适合印二维码。
            </p>
            <button class="btn btn-primary pub-go" id="pubDownload">下载网页文件</button>

            <div class="pub-platforms">
              <div class="plat">
                <div class="plat-head"><h4>Netlify Drop</h4><span class="plat-tag">最快</span></div>
                <p>打开后把下载的文件拖进去，几十秒出网址，<b>连账号都不用注册</b>。</p>
                <a class="btn-mini" href="https://app.netlify.com/drop" target="_blank" rel="noopener">打开 Netlify Drop ↗</a>
              </div>
              <div class="plat">
                <div class="plat-head"><h4>GitHub Pages</h4><span class="plat-tag">最稳</span></div>
                <p>新建 Public 仓库 → 上传文件并<b>重命名为 index.html</b> → Settings → Pages 选 main 分支。</p>
                <a class="btn-mini" href="https://github.com/new" target="_blank" rel="noopener">新建仓库 ↗</a>
              </div>
            </div>

            <div class="pub-back">
              <label for="pubUrl">上线了？把网址粘到这里 —— 自动出二维码并写进简历</label>
              <div class="pub-back-row">
                <input type="text" id="pubUrl" placeholder="https://你的名字.github.io"
                       value="${U.esc(d.profile.website || '')}">
                <button class="mbtn mbtn-primary" id="pubSave">生成二维码</button>
              </div>
              <div id="pubUrlOut"></div>
            </div>
          </div>
        `,
        foot: `<button class="mbtn" data-close>关闭</button>`,
        after: () => this.bindPublish()
      });
    },

    bindPublish() {
      const body = U.$('#modalBody');
      const closeBtn = U.$('#modalFoot').querySelector('[data-close]');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

      U.$$('.pub-tab', body).forEach(btn => {
        btn.addEventListener('click', () => {
          U.$$('.pub-tab', body).forEach(b => b.classList.toggle('active', b === btn));
          U.$$('.pub-pane', body).forEach(p => { p.hidden = p.dataset.pane !== btn.dataset.tab; });
        });
      });

      U.$('#pubGen').addEventListener('click', () => this.genShareLink());

      U.$('#pubDownload').addEventListener('click', () => {
        global.Export.site(global.Store.data);
        U.toast('已下载网页文件，下一步拖到 Netlify Drop 就行', 4500);
      });

      U.$('#pubSave').addEventListener('click', () => {
        const v = U.$('#pubUrl').value.trim();
        if (!v) { U.toast('先粘一个网址进来'); return; }
        if (!/^https?:\/\//i.test(v)) { U.toast('网址要以 http:// 或 https:// 开头'); return; }
        this.applySiteUrl(v, U.$('#pubUrlOut'));
      });
    },

    /* ---------------- 在线链接 ---------------- */
    genShareLink() {
      const out = U.$('#pubOnlineOut');
      if (!out) return;

      let url = '';
      try {
        url = global.Share.link(global.Store.data);
      } catch (e) {
        console.error(e);
        out.innerHTML = '<div class="hint" style="color:#dc2626;margin-top:14px">生成失败：压缩组件没有加载，刷新页面再试。</div>';
        return;
      }

      const len = url.length;
      const grade = global.Share.grade(len);

      // 超过 800 字符的二维码密到屏幕上根本扫不清，就不直接铺大图了，
      // 改成「点开看原始尺寸大图」，既不误导也不丢功能。
      const tooDense = len > 800;

      let qrData = '';
      try {
        const r = global.Export.qr(
          url,
          len > 1200 ? 4 : len > 400 ? 5 : 8,
          len > 2100 ? 'L' : 'M'
        );
        qrData = r.dataUrl;
      } catch (e) {
        qrData = '';
      }

      const qrThumb = !qrData
        ? `<div class="pub-qr placeholder"><span>链接过长<br>生成不了二维码</span></div>`
        : tooDense
          ? `<a class="pub-qr placeholder" href="${qrData}" target="_blank" rel="noopener"
                title="点开看原始尺寸，方便另一台设备扫">
               <span>
                 <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2V2zm1.5 1.5v2h2v-2h-2zM9 2h5v5H9V2zm1.5 1.5v2h2v-2h-2zM2 9h5v5H2V9zm1.5 1.5v2h2v-2h-2zM9 9h2v2H9V9zm3 0h2v2h-2V9zm-3 3h2v2H9v-2zm3 0h2v2h-2v-2z"/></svg>
                 <b>点开看大图</b>
               </span>
             </a>`
          : `<a class="pub-qr" href="${qrData}" target="_blank" rel="noopener" title="点开看原始尺寸">
               <img src="${qrData}" alt="二维码"></a>`;

      // 展示用的短地址：没人会去读两千个字符
      const shown = url.replace(/^https?:\/\//, '');
      const display = shown.length > 44 ? shown.slice(0, 44) + '…' : shown;

      let tip;
      if (grade === 'too-long') {
        tip = '链接偏长，个别聊天软件可能截断 —— 直接发链接比发二维码更保险。';
      } else if (tooDense) {
        tip = '二维码较密，点开左边看大图再扫；印在纸上建议不小于 4cm。';
      } else {
        tip = '二维码可以直接扫，印在纸上建议不小于 2cm。';
      }

      out.innerHTML = `
        <div class="pub-result">
          <div class="pub-head">
            ${qrThumb}
            <div class="pub-info">
              <div class="pub-copylab">你的在线简历地址</div>
              <div class="pub-url">${U.esc(display)}</div>
              <div class="pub-meta">共 ${len.toLocaleString()} 字符 · ${tip}</div>
              <div class="pub-row">
                <button class="mbtn mbtn-primary" id="pubCopy">复制链接</button>
                <button class="mbtn" id="pubQrDl"${qrData ? '' : ' disabled'}>下载二维码</button>
                <button class="mbtn" id="pubOpen">先看看</button>
              </div>
            </div>
          </div>
          <div class="hint" style="margin-top:12px">
            链接里装的就是这份简历本身 —— <b>改完内容再点一次会生成新链接</b>，旧链接不会跟着变。
          </div>
        </div>`;

      U.$('#pubCopy').addEventListener('click', async () => {
        const ok = await copyText(url);
        U.toast(ok ? '链接已复制，发出去就能打开' : '复制没成功，请手动打开页面复制');
      });

      U.$('#pubQrDl').addEventListener('click', () => {
        if (!qrData) { U.toast('这条链接太长，生成不了二维码'); return; }
        dlDataUrl(`${safeName()}-在线简历二维码.png`, qrData);
        U.toast('二维码已下载');
      });

      U.$('#pubOpen').addEventListener('click', () => global.open(url, '_blank', 'noopener'));
    },

    /* ---------------- 回填已上线的网址 ---------------- */
    applySiteUrl(url, mount) {
      global.Store.data.profile.website = url;
      global.Store.touch('site-url');

      const wf = U.$('[data-field="website"] input', U.$('#formRoot'));
      if (wf) wf.value = url;

      if (!mount) { U.toast('已保存到简历'); return; }

      try {
        const r = global.Export.qr(url, 8);
        mount.innerHTML = `
          <div class="qr-result" style="margin-top:14px">
            <div class="qr-canvas-box"><img src="${r.dataUrl}" alt="二维码"></div>
            <div class="qr-side">
              <div class="hint">
                已写进简历。作品集 PDF 页脚、个人主页都会带上这个二维码，
                打印建议不小于 2cm × 2cm。
              </div>
              <div><button class="mbtn" id="pubUrlDl">下载二维码 PNG</button></div>
            </div>
          </div>`;
        U.$('#pubUrlDl').addEventListener('click', () => {
          dlDataUrl(`${safeName()}-二维码.png`, r.dataUrl);
          U.toast('二维码已下载');
        });
        U.toast('已保存，简历页脚二维码已更新');
      } catch (e) {
        mount.innerHTML = '<div class="hint" style="color:#dc2626;margin-top:10px">网址太长，二维码生成失败</div>';
      }
    },

    /* ================= 快捷键 ================= */
    bindKeyboard() {
      document.addEventListener('keydown', e => {
        // Ctrl/Cmd + S → 备份
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          global.Export.json();
        }
        // Esc 关闭弹层
        if (e.key === 'Escape') this.closeModal();
      });
    }
  };

  /* ================= 小工具 ================= */

  /** 复制到剪贴板：优先用 Clipboard API，file:// 或 http 下退回 execCommand */
  function copyText(text) {
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-2000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) {
        return false;
      }
    };

    if (navigator.clipboard && global.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(fallback);
    }
    return Promise.resolve(fallback());
  }

  /** 下载 dataURL（二维码 PNG 用） */
  function dlDataUrl(filename, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function safeName() {
    const p = (global.Store && global.Store.data.profile) || {};
    return (p.name || 'me').replace(/[\\/:*?"<>|]/g, '');
  }

  global.App = App;

  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
