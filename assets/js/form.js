/* ===========================================================
   form.js — 表单渲染与交互
   原则：结构变化才重建；纯文本输入走事件委托，不重建（不丢焦点）
   =========================================================== */
(function (global) {
  'use strict';

  const U = global.U;
  const S = global.SCHEMA;

  const Form = {
    root: null,
    _openState: {},   // 记录章节展开状态，重建后还原

    /* ================= 初始化 ================= */
    mount(root) {
      this.root = root;
      this.bind();
      this.renderAll();
    },

    /* ================= 渲染 ================= */
    renderAll() {
      if (!this.root) return;
      const data = global.Store.data;

      // 记住展开状态
      U.$$('.section', this.root).forEach(d => {
        this._openState[d.dataset.section] = d.open;
      });

      const html = S.map(sec => this.renderSection(sec, data)).join('');
      this.root.innerHTML = html;

      // 还原展开状态；首次默认展开前两个
      U.$$('.section', this.root).forEach((d, i) => {
        const saved = this._openState[d.dataset.section];
        d.open = saved === undefined ? i < 2 : saved;
      });

      this.refreshCounts();
    },

    renderSection(sec, data) {
      if (sec.type === 'group') {
        return `
          <details class="section" data-section="${sec.id}">
            <summary>
              <span class="chev"></span>
              <span class="s-icon">${sec.icon || '·'}</span>
              <span class="s-title">${U.esc(sec.title)}</span>
            </summary>
            <div class="section-body">
              ${sec.desc ? `<div class="hint" style="margin:-2px 0 2px">${U.esc(sec.desc)}</div>` : ''}
              ${this.renderFields(sec.fields, {
                scope: 'group', sectionId: sec.id, entry: data[sec.id] || {}
              })}
            </div>
          </details>`;
      }

      // list
      const arr = data[sec.id] || [];
      const items = arr.map((it, i) => this.renderEntry(sec, it, i, arr.length)).join('');
      return `
        <details class="section" data-section="${sec.id}">
          <summary>
            <span class="chev"></span>
            <span class="s-icon">${sec.icon || '·'}</span>
            <span class="s-title">${U.esc(sec.title)}</span>
            <span class="s-count" data-count="${sec.id}">${arr.length}</span>
          </summary>
          <div class="section-body" data-list="${sec.id}">
            ${sec.desc ? `<div class="hint" style="margin:-2px 0 0">${U.esc(sec.desc)}</div>` : ''}
            ${items}
            <button class="add-btn" data-act="add" data-section="${sec.id}">
              <span>+</span> ${U.esc(sec.addText || '添加')}
            </button>
          </div>
        </details>`;
    },

    renderEntry(sec, item, index, total) {
      const label = sec.itemLabel ? sec.itemLabel(item) : '条目';
      return `
        <div class="entry" data-id="${item.id}" data-section="${sec.id}">
          <div class="entry-head">
            <span class="e-name" title="${U.esc(label)}">${U.esc(label)}</span>
            <div class="entry-tools">
              <button class="icon-btn" data-act="up" title="上移" ${index === 0 ? 'disabled style="opacity:.3"' : ''}>↑</button>
              <button class="icon-btn" data-act="down" title="下移" ${index === total - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
              <button class="icon-btn danger" data-act="del" title="删除">✕</button>
            </div>
          </div>
          <div class="entry-body">
            ${this.renderFields(sec.fields, { scope: 'entry', sectionId: sec.id, entry: item })}
          </div>
        </div>`;
    },

    /** 把 half 字段两两成行 */
    renderFields(fields, ctx) {
      let out = '';
      let buf = [];

      const flush = () => {
        if (!buf.length) return;
        if (buf.length === 1) {
          out += buf[0];
        } else {
          out += `<div class="row-2">${buf.join('')}</div>`;
        }
        buf = [];
      };

      fields.forEach(f => {
        const html = this.renderField(f, ctx);
        if (f.half) {
          buf.push(html);
          if (buf.length === 2) flush();
        } else {
          flush();
          out += html;
        }
      });
      flush();
      return out;
    },

    renderField(f, ctx) {
      const val = ctx.entry ? ctx.entry[f.key] : '';
      const id = `${ctx.scope}-${ctx.sectionId}-${ctx.entry && ctx.entry.id ? ctx.entry.id : 'g'}-${f.key}`;
      const attrs = `data-k="${f.key}" id="${id}"`;
      const ph = f.ph ? `placeholder="${U.esc(f.ph).replace(/\n/g, '&#10;')}"` : '';

      let inner = '';

      switch (f.type) {
        case 'textarea':
          inner = `<textarea ${attrs} class="${f.tall ? 'tall' : ''}" ${ph}>${U.esc(val || '')}</textarea>`;
          break;

        case 'month':
          inner = `<input type="month" ${attrs} value="${U.esc(val || '')}">`;
          break;

        case 'select':
          inner = `<select ${attrs}>` +
            (f.options || []).map(o => {
              const v = typeof o === 'string' ? o : o.v;
              const t = typeof o === 'string' ? o : o.t;
              return `<option value="${U.esc(v)}" ${val === v ? 'selected' : ''}>${U.esc(t)}</option>`;
            }).join('') + `</select>`;
          break;

        case 'photo':
          inner = `
            <div class="avatar-row">
              <div class="avatar-prev ${val ? 'has-img' : ''}"
                   ${val ? `style="background-image:url('${val}')"` : ''}
                   data-prev>${val ? '' : '未上传'}</div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <button class="mbtn" style="padding:6px 12px;font-size:12.5px" data-act="photo-pick" data-k="${f.key}">选择图片</button>
                ${val ? `<button class="link-btn" data-act="photo-clear" data-k="${f.key}" style="text-align:left">移除</button>` : ''}
              </div>
              <input type="file" accept="image/*" hidden data-file="single" data-k="${f.key}">
            </div>`;
          break;

        case 'tags': {
          const items = Array.isArray(val) ? val : [];
          inner = `
            <div class="tag-wrap" data-tags data-k="${f.key}">
              ${items.map(t => `
                <span class="tag"><b>${U.esc(t)}</b><button data-act="tag-del" data-tag="${U.esc(t)}">✕</button></span>
              `).join('')}
              <input class="tag-input" placeholder="${U.esc(f.ph || '输入后回车')}" data-tag-input data-k="${f.key}">
            </div>`;
          break;
        }

        case 'images': {
          const imgs = Array.isArray(val) ? val : [];
          inner = `
            <div class="img-grid" data-imgs data-k="${f.key}">
              ${imgs.map((src, i) => `
                <div class="img-cell">
                  <img src="${src}" alt="">
                  <button class="del" data-act="img-del" data-idx="${i}" title="删除">✕</button>
                </div>`).join('')}
              <div class="img-cell add" data-act="img-add" data-k="${f.key}" title="添加图片">+</div>
            </div>
            <input type="file" accept="image/*" multiple hidden data-file="multi" data-k="${f.key}">`;
          break;
        }

        default:
          inner = `<input type="text" ${attrs} value="${U.esc(val || '')}" ${ph}>`;
      }

      const label = f.type === 'photo' || f.type === 'images' || f.type === 'tags'
        ? `<label>${U.esc(f.label)}</label>`
        : `<label for="${id}">${U.esc(f.label)}</label>`;

      return `<div class="field" data-field="${f.key}">
        ${label}
        ${inner}
        ${f.hint ? `<div class="hint">${U.esc(f.hint)}</div>` : ''}
      </div>`;
    },

    /* ================= 计数 ================= */
    refreshCounts() {
      S.forEach(sec => {
        if (sec.type !== 'list') return;
        const badge = U.$(`[data-count="${sec.id}"]`, this.root);
        if (badge) badge.textContent = (global.Store.data[sec.id] || []).length;
      });
    },

    /* ================= 定位辅助 ================= */
    /** 从事件目标向上找条目上下文 */
    ctxOf(node) {
      const entryEl = node.closest ? node.closest('.entry') : null;
      const secEl = node.closest ? node.closest('.section') : null;
      return {
        entryEl,
        sectionId: entryEl ? entryEl.dataset.section : (secEl ? secEl.dataset.section : null),
        entryId: entryEl ? entryEl.dataset.id : null
      };
    },

    itemRef(ctx) {
      if (!ctx.entryId) return null;
      const arr = global.Store.data[ctx.sectionId];
      if (!Array.isArray(arr)) return null;
      const idx = arr.findIndex(it => it.id === ctx.entryId);
      return idx < 0 ? null : { arr, idx, item: arr[idx] };
    },

    /** 更新条目头部标题 */
    syncEntryHead(entryEl, sectionId, item) {
      const sec = S.find(s => s.id === sectionId);
      if (!sec || !entryEl) return;
      const nameEl = U.$('.e-name', entryEl);
      const label = sec.itemLabel ? sec.itemLabel(item) : '';
      if (nameEl) {
        nameEl.textContent = label;
        nameEl.title = label;
      }
      const subEl = U.$('[data-sub]', entryEl);
      if (subEl && sec.itemSub) subEl.textContent = sec.itemSub(item) || '';
    },

    /* ================= 事件 ================= */
    bind() {
      const root = this.root;

      /* --- 文本输入 --- */
      root.addEventListener('input', e => {
        const t = e.target;
        if (!t.dataset) return;

        // 标签输入框单独处理（回车才提交）
        if (t.hasAttribute('data-tag-input')) return;

        const k = t.dataset.k;
        if (!k) return;

        const ctx = this.ctxOf(t);
        if (!ctx.sectionId) return;

        if (ctx.entryId) {
          const ref = this.itemRef(ctx);
          if (!ref) return;
          ref.item[k] = t.value;
          this.syncEntryHead(ctx.entryEl, ctx.sectionId, ref.item);
        } else {
          global.Store.data[ctx.sectionId][k] = t.value;
        }
        global.Store.touch();
      });

      /* --- 月份变化也走 change（部分浏览器 input 不触发） --- */
      root.addEventListener('change', e => {
        const t = e.target;
        if (!t.dataset || t.type !== 'month') return;
        const k = t.dataset.k;
        if (!k) return;
        const ctx = this.ctxOf(t);
        if (!ctx.sectionId) return;
        if (ctx.entryId) {
          const ref = this.itemRef(ctx);
          if (ref) ref.item[k] = t.value;
        } else {
          global.Store.data[ctx.sectionId][k] = t.value;
        }
        global.Store.touch();
      });

      /* --- 标签回车 --- */
      root.addEventListener('keydown', e => {
        const t = e.target;
        if (!t.hasAttribute || !t.hasAttribute('data-tag-input')) return;

        const ctx = this.ctxOf(t);

        if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
          e.preventDefault();
          const raw = t.value.trim().replace(/[,，]$/, '');
          if (!raw) return;
          const ref = this.itemRef(ctx);
          if (!ref) return;
          if (!Array.isArray(ref.item.items)) ref.item.items = [];
          if (!ref.item.items.includes(raw)) ref.item.items.push(raw);
          t.value = '';
          this.syncEntryHead(ctx.entryEl, ctx.sectionId, ref.item);
          this.reRenderEntry(ctx);
          global.Store.touch();
        }

        // 空输入框按退格 → 删掉最后一个标签
        if (e.key === 'Backspace' && t.value === '') {
          const ref = this.itemRef(ctx);
          if (ref && Array.isArray(ref.item.items) && ref.item.items.length) {
            ref.item.items.pop();
            this.syncEntryHead(ctx.entryEl, ctx.sectionId, ref.item);
            this.reRenderEntry(ctx);
            global.Store.touch();
          }
        }
      });

      /* --- 点击 --- */
      root.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;

        const act = btn.dataset.act;
        const ctx = this.ctxOf(btn);

        switch (act) {
          case 'add': return this.addItem(btn.dataset.section);
          case 'del': return this.delItem(ctx);
          case 'up': return this.moveItem(ctx, -1);
          case 'down': return this.moveItem(ctx, 1);
          case 'photo-pick': return this.pickPhoto(ctx, btn.dataset.k);
          case 'photo-clear': return this.clearPhoto(ctx, btn.dataset.k);
          case 'img-add': return this.pickImages(ctx, btn.dataset.k);
          case 'img-del': return this.delImage(ctx, btn.dataset.k, Number(btn.dataset.idx));
          case 'tag-del': return this.delTag(ctx, btn.dataset.k, btn.dataset.tag);
        }
      });

      /* --- 文件选择 --- */
      root.addEventListener('change', async e => {
        const t = e.target;
        if (!t.dataset || !t.dataset.file) return;
        const kind = t.dataset.file;
        const k = t.dataset.k;
        const files = Array.from(t.files || []);
        t.value = '';
        if (!files.length) return;

        const ctx = this.ctxOf(t);

        try {
          if (kind === 'single') {
            const r = await U.compressImage(files[0], { max: 480, quality: 0.86 });
            global.Store.data[ctx.sectionId][k] = r.dataUrl;
            global.Store.touch();
            this.refreshPhotoField(ctx, k, r.dataUrl);
            U.toast('图片已添加');
          } else if (kind === 'multi') {
            const ref = this.itemRef(ctx);
            if (!ref) return;
            if (!Array.isArray(ref.item.images)) ref.item.images = [];
            U.toast(`正在处理 ${files.length} 张图片…`);
            for (const f of files) {
              const r = await U.compressImage(f, { max: 1400, quality: 0.82 });
              ref.item.images.push(r.dataUrl);
            }
            ref.item.cover = ref.item.images[0];
            this.reRenderEntry(ctx);
            global.Store.touch();
            U.toast(`已添加 ${files.length} 张图片`);
          }
        } catch (err) {
          console.error(err);
          U.toast('图片处理失败：' + (err.message || '未知错误'));
        }
      });
    },

    /* ================= 条目操作 ================= */
    addItem(sectionId) {
      const sec = S.find(s => s.id === sectionId);
      if (!sec) return;
      const item = { id: U.uid(sectionId.slice(0, 3)) };
      sec.fields.forEach(f => {
        if (f.type === 'tags' || f.type === 'images') item[f.key] = [];
        else item[f.key] = '';
      });
      if (sectionId === 'works') item.images = [];
      if (sectionId === 'skills') item.items = [];

      global.Store.data[sectionId].push(item);
      global.Store.touch();

      // 只重建这一个列表（少闪）
      this.reRenderList(sectionId);
      U.toast('已添加一条，别忘了填写');

      // 滚到新条目
      requestAnimationFrame(() => {
        const el = U.$(`.entry[data-id="${item.id}"]`, this.root);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    },

    delItem(ctx) {
      const ref = this.itemRef(ctx);
      if (!ref) return;
      const label = U.$('.e-name', ctx.entryEl);
      const name = label ? label.textContent : '这一条';
      if (!confirm(`确定删除「${name}」？此操作不可撤销。`)) return;
      ref.arr.splice(ref.idx, 1);
      global.Store.touch();
      this.reRenderList(ctx.sectionId);
    },

    moveItem(ctx, dir) {
      const ref = this.itemRef(ctx);
      if (!ref) return;
      const next = ref.idx + dir;
      if (next < 0 || next >= ref.arr.length) return;
      const [it] = ref.arr.splice(ref.idx, 1);
      ref.arr.splice(next, 0, it);
      global.Store.touch();
      this.reRenderList(ctx.sectionId);
    },

    reRenderList(sectionId) {
      const sec = S.find(s => s.id === sectionId);
      const wrap = U.$(`[data-list="${sectionId}"]`, this.root);
      if (!sec || !wrap) return;

      const arr = global.Store.data[sectionId] || [];
      const scrollTop = this.root.scrollTop;

      wrap.innerHTML =
        (sec.desc ? `<div class="hint" style="margin:-2px 0 0">${U.esc(sec.desc)}</div>` : '') +
        arr.map((it, i) => this.renderEntry(sec, it, i, arr.length)).join('') +
        `<button class="add-btn" data-act="add" data-section="${sectionId}">
           <span>+</span> ${U.esc(sec.addText || '添加')}
         </button>`;

      this.root.scrollTop = scrollTop;
      this.refreshCounts();
    },

    /** 只重建一个条目（标签变化时） */
    reRenderEntry(ctx) {
      const ref = this.itemRef(ctx);
      const sec = S.find(s => s.id === ctx.sectionId);
      if (!ref || !sec || !ctx.entryEl) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = this.renderEntry(sec, ref.item, ref.idx, ref.arr.length);
      const fresh = tmp.firstElementChild;
      ctx.entryEl.replaceWith(fresh);

      // 焦点回到标签输入
      const nextInput = U.$('[data-tag-input]', fresh);
      if (nextInput) nextInput.focus();
    },

    /* ================= 图片 ================= */
    pickPhoto(ctx, k) {
      const input = U.$('input[data-file="single"]', ctx.entryEl || this.root);
      if (input) input.click();
    },

    clearPhoto(ctx, k) {
      global.Store.data[ctx.sectionId][k] = '';
      global.Store.touch();
      this.refreshPhotoField(ctx, k, '');
    },

    refreshPhotoField(ctx, k, src) {
      const field = U.$(`[data-field="${k}"]`, ctx.entryEl || this.root);
      if (!field) return;
      const prev = U.$('[data-prev]', field);
      if (!prev) return;
      if (src) {
        prev.classList.add('has-img');
        prev.style.backgroundImage = `url('${src}')`;
        prev.textContent = '';
      } else {
        prev.classList.remove('has-img');
        prev.style.backgroundImage = '';
        prev.textContent = '未上传';
      }
      // 重建「移除」按钮
      const wrap = prev.parentElement;
      const oldBtn = U.$('[data-act="photo-clear"]', wrap);
      if (oldBtn) oldBtn.remove();
      if (src) {
        const b = U.el('button', {
          class: 'link-btn',
          'data-act': 'photo-clear',
          'data-k': k,
          style: 'text-align:left'
        }, '移除');
        wrap.children[1].appendChild(b);
      }
    },

    pickImages(ctx, k) {
      const input = U.$('input[data-file="multi"]', ctx.entryEl || this.root);
      if (input) input.click();
    },

    delImage(ctx, k, idx) {
      const ref = this.itemRef(ctx);
      if (!ref) return;
      const imgs = ref.item.images || [];
      imgs.splice(idx, 1);
      ref.item.cover = imgs[0] || '';
      this.reRenderEntry(ctx);
      global.Store.touch();
    },

    delTag(ctx, k, tag) {
      const ref = this.itemRef(ctx);
      if (!ref) return;
      ref.item[k] = (ref.item[k] || []).filter(t => t !== tag);
      this.syncEntryHead(ctx.entryEl, ctx.sectionId, ref.item);
      this.reRenderEntry(ctx);
      global.Store.touch();
    }
  };

  global.Form = Form;
})(window);
