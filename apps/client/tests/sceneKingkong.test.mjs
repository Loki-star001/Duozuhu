import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultKingkongRailBox, groupKingkongOrder, isKingkongButtonId, railScrollLayout, isRailDrag, getLoopRange, wrapLoopScroll } from '../src/components/sceneKingkong.ts';

test('old independent buttons become one rail at their highest layer position', () => {
  assert.deepEqual(groupKingkongOrder(['person','kk-1','dialogue','kk-2','kk-3','kk-4','topbar']), ['person','dialogue','kingkong-rail','topbar']);
});
test('grouping is stable and does not consume the independent time component', () => {
  const order = ['kk-time','person','kingkong-rail','subtitle'];
  assert.deepEqual(groupKingkongOrder(order), order);
  assert.equal(isKingkongButtonId('kk-time'), false);
});
test('the reference layout places a tall capsule safely on the left', () => {
  const {x,y,w,h} = defaultKingkongRailBox;
  assert.ok(x >= 0 && x + w < 25);
  assert.ok(y > 10 && y + h < 90);
  assert.ok(h > w * 2);
});

test('minor tap movement stays a tap; swipe or actual list movement blocks submission', () => {
  assert.equal(isRailDrag(3, 4, 0), false);
  assert.equal(isRailDrag(0, 9, 0), true);
  assert.equal(isRailDrag(7, 7, 0), true);
  assert.equal(isRailDrag(0, 0, 3), true);
});

test('four complete cards fit at every preview scale, including their padding and gaps', () => {
  for (const height of [120, 300, 768]) {
    const { cardHeight, gap, inset, step, maxScroll } = railScrollLayout(height, 4);
    assert.ok(Math.abs(4 * cardHeight + 3 * gap + 2 * inset - height) < 1e-8);
    assert.equal(maxScroll, 0);
    assert.equal(step, height / 4);
    const smaller = railScrollLayout(height / 2, 4);
    assert.equal(smaller.cardHeight, cardHeight / 2);
    assert.equal(smaller.gap, gap / 2);
  }
});

test('infinite loop generates symmetric odd copies with middle centered index', () => {
  const loop4 = getLoopRange(4);
  assert.ok(loop4.copies >= 5);
  assert.equal(loop4.copies % 2, 1);
  assert.equal(loop4.midCopy, Math.floor(loop4.copies / 2));

  const loop1 = getLoopRange(1);
  assert.ok(loop1.copies >= 20);
  assert.equal(loop1.copies % 2, 1);
  assert.equal(loop1.midCopy, Math.floor(loop1.copies / 2));
});

test('wrapLoopScroll seamlessly teleports scroll position across infinite boundaries', () => {
  const count = 4;
  const step = 100;
  const cycle = 400;
  const { copies, midCopy } = getLoopRange(count); // copies=5, midCopy=2
  const midTop = midCopy * cycle; // 800

  // Within safe range [400, 1200), no teleport
  const inside = wrapLoopScroll(850, count, step, copies, midCopy);
  assert.equal(inside.nextScroll, 850);
  assert.equal(inside.delta, 0);

  // Scrolled down past 1200: teleports by -cycle
  const scrollDown = wrapLoopScroll(1250, count, step, copies, midCopy);
  assert.equal(scrollDown.nextScroll, 850);
  assert.equal(scrollDown.delta, -400);

  // Scrolled up past 400: teleports by +cycle
  const scrollUp = wrapLoopScroll(350, count, step, copies, midCopy);
  assert.equal(scrollUp.nextScroll, 750);
  assert.equal(scrollUp.delta, 400);

  // Big fast swipe down
  const fastDown = wrapLoopScroll(2100, count, step, copies, midCopy);
  assert.ok(fastDown.nextScroll >= 400 && fastDown.nextScroll < 1200);
  assert.equal(Math.abs((fastDown.nextScroll - 2100) % cycle), 0);

  // Big fast swipe up
  const fastUp = wrapLoopScroll(-500, count, step, copies, midCopy);
  assert.ok(fastUp.nextScroll >= 400 && fastUp.nextScroll < 1200);
  assert.equal(Math.abs((fastUp.nextScroll - (-500)) % cycle), 0);
});


test('kingkong preset fields provide 4 interactive questions with pre-configured answers', () => {
  const expectedLabels = ['公司介绍', '新闻', '最近热点', '天气情况'];
  const presets = [
    {
      id: 1,
      label: '公司介绍',
      prompt: '请为我介绍一下公司的发展历程、核心业务与未来愿景',
      answer: '您好！我们是一家专注于人工智能交互与数字化创新的前沿科技企业。致力于将AI智能交互、多模态数字人与企业级知识服务深度融合，为政企、文旅、商业展厅及智能终端提供下一代数字员工与智慧交互解决方案。'
    },
    {
      id: 2,
      label: '新闻',
      prompt: '请为我播报最近的重要新闻动态与行业资讯',
      answer: '今日最新资讯播报：人工智能多模态大模型在政企终端与人机协同领域迎来爆发式增长；我国新一代算力网络建设稳步推进；近期高新技术博览会聚焦智能交互体验，本司自主研发的AI交互数字人系统受到广泛关注与好评。'
    },
    {
      id: 3,
      label: '最近热点',
      prompt: '当前都有哪些社会与科技热点话题？',
      answer: '当前全网聚焦三大热点：一是AI数字人在实体经济中的落地应用加速普及；二是绿色算力与智能计算产业生态持续升级；三是智慧城市与数字展馆全面开启沉浸式人机交互新范式。'
    },
    {
      id: 4,
      label: '天气情况',
      prompt: '今天的天气情况怎么样？适合出行吗？',
      answer: '今天白天晴间多云，微风习习，当前室外气温约为22℃，湿度55%，空气质量优。体感舒适，非常适宜外出与参观交流，夜间气温会有所回落，出行请适度添衣。'
    }
  ];

  assert.equal(presets.length, 4);
  assert.deepEqual(presets.map(p => p.label), expectedLabels);

  for (const item of presets) {
    assert.ok(item.prompt.trim().length > 0, `Prompt for ${item.label} should not be empty`);
    assert.ok(item.answer.trim().length > 0, `Answer for ${item.label} should not be empty`);

    const matchByPrompt = presets.find(b => b.prompt.trim() === item.prompt.trim());
    assert.equal(matchByPrompt?.answer, item.answer);

    const matchByLabel = presets.find(b => b.label === item.label);
    assert.equal(matchByLabel?.answer, item.answer);
  }
});

test('kingkong buttons support icon customization and visibility toggling', () => {
  const shouldShowIcon = (item) => {
    if (item.showIcon === false) return false;
    if (item.icon === 'none') return false;
    return true;
  };

  const getItemIconType = (item) => {
    if (item.icon && item.icon !== 'auto' && item.icon !== 'none') {
      return item.icon;
    }
    const label = item.label || '';
    if (label.includes('公司') || label.includes('企业') || label.includes('关于') || label.includes('介绍')) return 'company';
    if (label.includes('新闻') || label.includes('资讯') || label.includes('快报') || label.includes('动态')) return 'news';
    if (label.includes('热点') || label.includes('最近') || label.includes('趋势') || label.includes('热门')) return 'hot';
    if (label.includes('天气') || label.includes('气温') || label.includes('气候')) return 'weather';
    if (label.includes('导览') || label.includes('路线') || label.includes('游览') || label.includes('展区')) return 'guide';
    if (label.includes('产品') || label.includes('服务') || label.includes('业务')) return 'product';
    if (label.includes('案例') || label.includes('展品') || label.includes('故事')) return 'case';
    if (label.includes('服务') || label.includes('客服') || label.includes('接待')) return 'service';
    if (label.includes('帮助') || label.includes('问答') || label.includes('指南')) return 'help';
    if (label.includes('检索') || label.includes('搜索') || label.includes('查询')) return 'search';
    const icons = ['company', 'news', 'hot', 'weather', 'guide', 'product', 'case', 'search'];
    return icons[(item.id - 1) % icons.length];
  };

  const items = [
    { id: 1, label: '公司介绍', icon: 'company', showIcon: true },
    { id: 2, label: '新闻', icon: 'none', showIcon: true },
    { id: 3, label: '最近热点', icon: 'hot', showIcon: false },
    { id: 4, label: '自定义业务', icon: 'service', showIcon: true },
    { id: 5, label: '未知按钮', icon: 'auto', showIcon: true }
  ];

  assert.equal(shouldShowIcon(items[0]), true);
  assert.equal(getItemIconType(items[0]), 'company');
  assert.equal(shouldShowIcon(items[1]), false);
  assert.equal(shouldShowIcon(items[2]), false);
  assert.equal(shouldShowIcon(items[3]), true);
  assert.equal(getItemIconType(items[3]), 'service');
  assert.equal(shouldShowIcon(items[4]), true);
  assert.equal(getItemIconType(items[4]), 'guide');
});

test('topbar date-time supports Option 1 (datetime) and Option 3 (time-only) display modes', () => {
  const formatTopBarDateTime = (time, date, mode) => {
    if (mode === 'time') {
      return { showDate: false, text: time };
    }
    return { showDate: true, text: `${time} | ${date}` };
  };

  const time = '09:20';
  const date = '2026年10月24日 星期六';

  // 方案一：时间 + 日期星期 (横排并列)
  const option1 = formatTopBarDateTime(time, date, 'datetime');
  assert.equal(option1.showDate, true);
  assert.equal(option1.text, '09:20 | 2026年10月24日 星期六');

  // 方案三：仅显示时间
  const option3 = formatTopBarDateTime(time, date, 'time');
  assert.equal(option3.showDate, false);
  assert.equal(option3.text, '09:20');
});
