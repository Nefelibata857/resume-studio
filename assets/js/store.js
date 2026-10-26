/* ===========================================================
   store.js — 状态容器 / 自动保存 / 订阅
   =========================================================== */
(function (global) {
  'use strict';

  const U = global.U;

  const Store = {
    data: global.DATA.blank(),
    _subs: [],
    _saveTimer: null,
    _dirty: false,

    /* ---------- 订阅 ---------- */
    on(fn) {
      this._subs.push(fn);
      return () => {
        this._subs = this._subs.filter(f => f !== fn);
      };
    },

    emit(reason) {
      this._subs.forEach(fn => {
        try { fn(this.data, reason); } catch (e) { console.error(e); }
      });
    },

    /* ---------- 生命周期 ---------- */
    async init() {
      const mode = await U.storage.init();
      let loaded = null;
      try {
        loaded = await U.storage.get();
      } catch (e) {
        console.warn('读取本地数据失败', e);
      }
      this.data = global.DATA.normalize(loaded || global.DATA.blank());
      this.emit('init');
      return mode;
    },

    /* ---------- 写入 ---------- */
    /** 只标记变更：UI 提交后调用 */
    touch(reason) {
      this._dirty = true;
      this.emit(reason || 'update');
      this._scheduleSave();
    },

    /** 批量替换（导入 / 载入示例 / 清空） */
    replace(next, reason) {
      this.data = global.DATA.normalize(next);
      this._dirty = true;
      this.emit(reason || 'replace');
      this._scheduleSave(true);
    },

    _scheduleSave(immediate) {
      const dot = U.$('#saveDot');
      const txt = U.$('#saveText');
      if (dot) dot.classList.add('saving');
      if (txt) txt.textContent = '正在保存…';

      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.flush(), immediate ? 60 : 700);
    },

    async flush() {
      const dot = U.$('#saveDot');
      const txt = U.$('#saveText');
      try {
        await U.storage.set(this.data);
        this._dirty = false;
        if (dot) dot.classList.remove('saving');
        if (txt) {
          txt.textContent = U.storage.mode === 'memory'
            ? '环境不支持本地保存，请及时「备份」'
            : '已自动保存到本机';
        }
      } catch (e) {
        console.warn('保存失败', e);
        if (dot) dot.classList.remove('saving');
        if (txt) txt.textContent = '保存失败，建议先「备份」';
        if (!this._warned) {
          this._warned = true;
          U.toast('本地空间不足，图片可能过多。请先「备份」再删除部分图片');
        }
      }
    },

    /* ---------- 便捷取值 ---------- */
    list(name) {
      return Array.isArray(this.data[name]) ? this.data[name] : [];
    },

    find(name, id) {
      return this.list(name).find(it => it.id === id) || null;
    },

    /** 整体体积估算 */
    sizeEstimate() {
      try { return JSON.stringify(this.data).length; } catch (e) { return 0; }
    }
  };

  global.Store = Store;
})(window);
