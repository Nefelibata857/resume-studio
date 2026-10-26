/* ===========================================================
   schema.js — 数据结构 + 表单定义 + 示例数据
   =========================================================== */
(function (global) {
  'use strict';

  const U = global.U;

  /* ---------------------------------------------------------
     表单章节定义
     type: 'group'（单组字段） | 'list'（可增删条目）
     field.type: text | textarea | month | select | photo | tags | images
     --------------------------------------------------------- */
  const SCHEMA = [
    {
      id: 'profile',
      type: 'group',
      icon: '◈',
      title: '基本信息',
      desc: 'HR 第一眼看到的部分，务必准确',
      fields: [
        { key: 'name', label: '姓名', type: 'text', ph: '王勇超', half: true },
        { key: 'jobTitle', label: '求职意向 / 身份', type: 'text', ph: '建筑设计师 · 2027 届', half: true },
        { key: 'phone', label: '手机', type: 'text', ph: '138 0000 0000', half: true },
        { key: 'email', label: '邮箱', type: 'text', ph: 'you@example.com', half: true },
        { key: 'city', label: '所在城市', type: 'text', ph: '西安', half: true },
        { key: 'website', label: '个人主页 / 作品链接', type: 'text', ph: 'https://your-name.github.io', half: true },
        {
          key: 'summary',
          label: '个人简介',
          type: 'textarea',
          ph: '一句话讲清你是谁、擅长什么、想做什么。例如：\n城市设计专业应届生，熟悉总图强排与户型推敲，参与 8 个居住项目，擅长用图纸讲清设计逻辑。',
          hint: '建议 60–120 字，突出与目标岗位相关的能力'
        },
        { key: 'photo', label: '证件照', type: 'photo', hint: '可选。竖向 3:4 最佳，会自动压缩' }
      ]
    },
    {
      id: 'education',
      type: 'list',
      icon: '❑',
      title: '教育经历',
      addText: '添加教育经历',
      itemLabel: it => it.school || '新的教育经历',
      itemSub: it => it.major,
      fields: [
        { key: 'school', label: '学校', type: 'text', ph: '西安建筑科技大学', half: true },
        { key: 'major', label: '专业', type: 'text', ph: '城市设计', half: true },
        { key: 'degree', label: '学历', type: 'text', ph: '本科', half: true },
        { key: 'gpa', label: 'GPA / 排名（可选）', type: 'text', ph: '3.8 / 4.0　专业前 5%', half: true },
        { key: 'start', label: '入学时间', type: 'month', half: true },
        { key: 'end', label: '毕业时间', type: 'month', half: true },
        {
          key: 'detail', label: '主修课程 / 在校表现（可选）', type: 'textarea', ph: '每行一条，例如：\n主修：建筑设计、城市设计原理、GIS 应用\n连续三年获校级奖学金'
        }
      ]
    },
    {
      id: 'experience',
      type: 'list',
      icon: '❑',
      title: '实习 / 工作经历',
      addText: '添加实习经历',
      itemLabel: it => it.company || '新的实习经历',
      itemSub: it => it.role,
      fields: [
        { key: 'company', label: '公司 / 单位', type: 'text', ph: '基准方中建筑设计有限公司', half: true },
        { key: 'role', label: '岗位', type: 'text', ph: '建筑设计实习生', half: true },
        { key: 'start', label: '开始时间', type: 'month', half: true },
        { key: 'end', label: '结束时间', type: 'month', half: true },
        {
          key: 'desc',
          label: '工作内容与成果',
          type: 'textarea',
          tall: true,
          ph: '每行一条，尽量写清「做了什么 + 做出什么结果」：\n参与 8 个居住项目的强排与总图，独立完成 3 个户型方案\n协助完成 XX 项目投标文本，方案中标',
          hint: '用数字说话：数量、排名、效率提升，比形容词有说服力'
        }
      ]
    },
    {
      id: 'projects',
      type: 'list',
      icon: '❑',
      title: '项目 / 课题经历',
      addText: '添加项目',
      itemLabel: it => it.name || '新的项目',
      itemSub: it => it.role,
      fields: [
        { key: 'name', label: '项目名称', type: 'text', ph: '城郊社区公共空间更新设计', half: true },
        { key: 'role', label: '担任角色', type: 'text', ph: '方案主创 / 3 人团队', half: true },
        { key: 'start', label: '开始时间', type: 'month', half: true },
        { key: 'end', label: '结束时间', type: 'month', half: true },
        { key: 'link', label: '项目链接（可选）', type: 'text', ph: 'https://...' },
        {
          key: 'desc',
          label: '项目描述',
          type: 'textarea',
          tall: true,
          ph: '每行一条：背景 / 你的贡献 / 结果。例：\n针对老旧社区活动空间不足，提出「见缝插针」式口袋公园策略\n独立完成总平面与效果图，方案被街道办采纳落地'
        }
      ]
    },
    {
      id: 'skills',
      type: 'list',
      icon: '❑',
      title: '技能 / 证书',
      addText: '添加技能组',
      itemLabel: it => it.group || '新的技能组',
      itemSub: it => (it.items || []).join('、'),
      fields: [
        { key: 'group', label: '分类', type: 'text', ph: '设计软件 / 语言 / 办公', half: false },
        {
          key: 'items', label: '技能项', type: 'tags', ph: '输入后按回车添加',
          hint: '例如 AutoCAD、SketchUp、Rhino、D5 渲染、CET-6'
        }
      ]
    },
    {
      id: 'awards',
      type: 'list',
      icon: '❑',
      title: '荣誉 / 奖项',
      addText: '添加奖项',
      itemLabel: it => it.title || '新的奖项',
      itemSub: it => it.issuer,
      fields: [
        { key: 'title', label: '奖项名称', type: 'text', ph: '全国大学生建筑设计竞赛 三等奖', half: true },
        { key: 'date', label: '获奖时间', type: 'month', half: true },
        { key: 'issuer', label: '颁发单位（可选）', type: 'text', ph: '中国建筑学会' },
        { key: 'desc', label: '备注（可选）', type: 'text', ph: '全国前 3%' }
      ]
    },
    {
      id: 'works',
      type: 'list',
      icon: '▣',
      title: '作品集',
      desc: '设计 / 建筑 / 视觉类同学的加分项，其他专业可放项目成果图',
      addText: '添加作品',
      itemLabel: it => it.title || '新的作品',
      itemSub: it => [it.category, it.year].filter(Boolean).join(' · '),
      fields: [
        { key: 'title', label: '作品名称', type: 'text', ph: '老城街角 · 微更新设计', half: true },
        { key: 'category', label: '类别', type: 'text', ph: '建筑设计 / 品牌视觉 / 摄影', half: true },
        { key: 'year', label: '年份（可选）', type: 'text', ph: '2026', half: true },
        { key: 'desc', label: '一句话说明（可选）', type: 'text', ph: '课程设计 · 主创', half: true },
        { key: 'images', label: '作品图片', type: 'images', hint: '支持多选上传，自动压缩。第一张作封面' }
      ]
    }
  ];

  /* ---------------- 空白初始数据 ---------------- */
  function blank() {
    return {
      profile: {
        name: '', jobTitle: '', phone: '', email: '', city: '',
        website: '', summary: '', photo: ''
      },
      education: [],
      experience: [],
      projects: [],
      skills: [],
      awards: [],
      works: [],
      settings: {
        template: 'classic',
        portfolio: true,
        portfolioCols: 2,
        portfolioTitle: '作品集',
        siteTitle: ''
      }
    };
  }

  /* ---------------- 占位图（示例用） ---------------- */
  /** 证件照占位：浅灰底 + 人像剪影，一眼看出是占位 */
  function photoPh() {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
      '<rect width="300" height="400" fill="#eef1f5"/>' +
      '<circle cx="150" cy="146" r="50" fill="#cbd5e1"/>' +
      '<path d="M62 332c0-46 40-78 88-78s88 32 88 78z" fill="#cbd5e1"/>' +
      '<text x="150" y="374" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="19" ' +
      'fill="#94a3b8" text-anchor="middle" letter-spacing="3">示例照片</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function ph(label, sub, c1, c2) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="800" height="600" fill="url(#g)"/>' +
      '<g fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5">' +
      '<path d="M0 420 L200 300 L340 380 L520 240 L800 400"/>' +
      '<path d="M0 480 L180 380 L360 450 L560 320 L800 460"/>' +
      '<circle cx="640" cy="140" r="90"/>' +
      '</g>' +
      '<text x="460" y="520" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="30" fill="rgba(255,255,255,.95)" text-anchor="end">' + label + '</text>' +
      '<text x="460" y="556" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="16" fill="rgba(255,255,255,.7)" text-anchor="end" letter-spacing="2">' + sub + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------------- 示例数据 ---------------- */
  function demo() {
    const d = blank();
    d.profile = {
      name: '王勇超',
      jobTitle: '建筑设计师 · 2027 届',
      phone: '138 0000 0000',
      email: 'wangyongchao@example.com',
      city: '西安',
      website: 'https://wangyongchao.github.io',
      summary: '城市设计专业应届生，熟悉居住项目强排与总图推敲，实习期间参与 8 个居住项目。擅长用图纸与数据把设计逻辑讲清楚，对户型产品与场地关系有持续观察。',
      photo: photoPh()
    };

    d.education = [{
      id: U.uid('edu'),
      school: '西安建筑科技大学',
      major: '城市设计',
      degree: '本科',
      gpa: '3.8 / 4.0　专业前 5%',
      start: '2023-09',
      end: '2027-06',
      detail: '主修：建筑设计、城市设计原理、场地设计、GIS 空间分析\n连续三年获校级一等奖学金'
    }];

    d.experience = [{
      id: U.uid('exp'),
      company: '基准方中建筑设计有限公司（西安）',
      role: '建筑设计实习生',
      start: '2026-07',
      end: '2026-08',
      desc: '参与 8 个居住项目的强排与总图设计，独立完成 3 个户型方案\n负责图册「总图 + 产品」板块，独立完成 40 余页版面\n配合主创完成投标文本，方案进入第二轮评审'
    }];

    d.projects = [{
      id: U.uid('prj'),
      name: '老城街角 · 社区微更新设计',
      role: '方案主创（3 人团队）',
      start: '2025-10',
      end: '2026-01',
      link: '',
      desc: '针对老城区公共活动空间不足，提出「见缝插针」式口袋公园策略\n独立完成总平面、剖透视与 1:200 模型，方案被街道办采纳落地'
    }, {
      id: U.uid('prj'),
      name: '城郊居住区强排方案比选',
      role: '方案设计',
      start: '2026-03',
      end: '2026-06',
      link: '',
      desc: '对比 3 种强排方案，从日照、容积率、产品配比三个维度建立评价表\n最终方案货值提升 6%，被选为投标主推方案'
    }];

    d.skills = [
      { id: U.uid('sk'), group: '设计软件', items: ['AutoCAD', '天正建筑', 'SketchUp', 'Rhino', 'D5 渲染', 'Photoshop'] },
      { id: U.uid('sk'), group: '分析与表达', items: ['GIS 空间分析', 'InDesign', 'Illustrator'] },
      { id: U.uid('sk'), group: '语言 / 证书', items: ['CET-6', '普通话二级甲等'] }
    ];

    d.awards = [
      { id: U.uid('aw'), title: '全国大学生建筑设计竞赛 三等奖', date: '2025-11', issuer: '中国建筑学会', desc: '全国前 3%' },
      { id: U.uid('aw'), title: '校级优秀学生干部', date: '2025-06', issuer: '西安建筑科技大学', desc: '' }
    ];

    d.works = [
      { id: U.uid('w'), title: '老城街角 · 微更新', category: '建筑设计', year: '2026', desc: '课程设计 · 主创', cover: ph('总平面与轴测', 'URBAN RENEWAL', '#0f766e', '#134e4a'), images: [ph('总平面与轴测', 'URBAN RENEWAL', '#0f766e', '#134e4a')] },
      { id: U.uid('w'), title: '云璟 · 居住区规划', category: '居住规划', year: '2026', desc: '实习项目 · 强排', cover: ph('强排方案', 'RESIDENTIAL', '#1e40af', '#1e3a8a'), images: [ph('强排方案', 'RESIDENTIAL', '#1e40af', '#1e3a8a')] },
      { id: U.uid('w'), title: '溪越里 · 图册版面', category: '平面版面', year: '2026', desc: '实习项目 · 图册', cover: ph('图册版面', 'EDITORIAL', '#9a3412', '#7c2d12'), images: [ph('图册版面', 'EDITORIAL', '#9a3412', '#7c2d12')] },
      { id: U.uid('w'), title: '山院 · 民宿改造', category: '室内设计', year: '2025', desc: '课程作业 · 独立完成', cover: ph('剖透视', 'INTERIOR', '#6d28d9', '#4c1d95'), images: [ph('剖透视', 'INTERIOR', '#6d28d9', '#4c1d95')] },
      { id: U.uid('w'), title: '城市肌理拼贴', category: '视觉实验', year: '2025', desc: '个人练习', cover: ph('拼贴实验', 'COLLAGE', '#be123c', '#881337'), images: [ph('拼贴实验', 'COLLAGE', '#be123c', '#881337')] },
      { id: U.uid('w'), title: '手绘 · 街巷速写', category: '手绘', year: '2024', desc: '日常记录', cover: ph('钢笔速写', 'SKETCH', '#475569', '#1e293b'), images: [ph('钢笔速写', 'SKETCH', '#475569', '#1e293b')] }
    ];

    d.settings.siteTitle = '王勇超 · 作品集';
    return d;
  }

  /* ---------------- 清洗 / 迁移 ---------------- */
  function normalize(raw) {
    const base = blank();
    if (!raw || typeof raw !== 'object') return base;

    const out = base;
    if (raw.profile && typeof raw.profile === 'object') {
      Object.keys(base.profile).forEach(k => {
        if (raw.profile[k] != null) out.profile[k] = String(raw.profile[k]);
      });
    }
    ['education', 'experience', 'projects', 'skills', 'awards', 'works'].forEach(listKey => {
      const arr = Array.isArray(raw[listKey]) ? raw[listKey] : [];
      out[listKey] = arr.map(it => {
        const o = Object.assign({}, it || {});
        if (!o.id) o.id = U.uid(listKey.slice(0, 3));
        if (listKey === 'skills' && !Array.isArray(o.items)) o.items = [];
        if (listKey === 'works') {
          if (!Array.isArray(o.images)) o.images = o.cover ? [o.cover] : [];
          if (!o.cover && o.images[0]) o.cover = o.images[0];
        }
        return o;
      });
    });
    if (raw.settings && typeof raw.settings === 'object') {
      Object.assign(out.settings, raw.settings);
    }
    if (out.settings.template !== 'classic' && out.settings.template !== 'sidebar') {
      out.settings.template = 'classic';
    }
    out.settings.portfolioCols = Number(out.settings.portfolioCols) === 3 ? 3 : 2;
    return out;
  }

  global.SCHEMA = SCHEMA;
  global.DATA = { blank, demo, normalize };
})(window);
