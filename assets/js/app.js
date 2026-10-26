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

      // 生成个人主页
      U.$('#btnSite').addEventListener('click', () => {
        const d = global.Store.data;
        if (!U.has(d.profile.name)) {
          U.toast('先填个姓名吧，作品集主页需要有名字');
          const el = U.$('[data-section="profile"]');
          if (el) { el.open = true; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
          return;
        }
        global.Store.data.settings.siteUrl = d.profile.website || d.settings.siteUrl || '';
        global.Export.site(d);
        setTimeout(() => this.openDeployGuide(), 600);
      });

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
      U.$('#modalTitle').textContent = opt.title || '';
      U.$('#modalBody').innerHTML = opt.body || '';
      U.$('#modalFoot').innerHTML = opt.foot || '';
      mask.hidden = false;
      if (typeof opt.after === 'function') opt.after();
    },

    closeModal() {
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
              先点顶部「生成个人主页」拿到网页文件，按提示部署上线后，把网址填到这里。
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

    /* ---------------- 部署指南弹层 ---------------- */
    openDeployGuide() {
      this.openModal({
        title: '个人主页已下载 · 三步上线',
        body: `
          <ol class="steps">
            <li>
              <span class="num">1</span>
              <div class="txt">
                <strong>新建仓库</strong>
                打开 github.com/new，仓库名填 <code>resume-studio</code>，
                勾选 <b>Public</b>，点 Create repository。
              </div>
            </li>
            <li>
              <span class="num">2</span>
              <div class="txt">
                <strong>上传文件</strong>
                进入仓库 → Add file → Upload files，
                把刚下载的 <code>姓名-个人主页.html</code> 拖进去，
                <b>重命名为 <code>index.html</code></b>（关键），然后 Commit。
              </div>
            </li>
            <li>
              <span class="num">3</span>
              <div class="txt">
                <strong>开启 Pages</strong>
                仓库 → Settings → Pages，
                Source 选 <b>Deploy from a branch</b>，
                Branch 选 <b>main</b> / <b>root</b>，Save。
              </div>
            </li>
            <li>
              <span class="num">✓</span>
              <div class="txt">
                <strong>拿到网址</strong>
                等 1–2 分钟，访问 <code>https://你的用户名.github.io/resume-studio</code>。
                把这个地址填进本工具的「个人主页」字段，简历和作品集上就会带上二维码。
              </div>
            </li>
          </ol>
          <div class="hint" style="margin-top:16px">
            提示：不想用 GitHub Pages 也行 —— 把 html 文件拖到 Netlify Drop（app.netlify.com/drop）同样能拿到网址，几十秒搞定。
          </div>
        `,
        foot: `<button class="mbtn mbtn-primary" data-close>明白了</button>`,
        after: () => {
          U.$('#modalFoot').querySelector('[data-close]').addEventListener('click', () => this.closeModal());
        }
      });
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

  global.App = App;

  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
