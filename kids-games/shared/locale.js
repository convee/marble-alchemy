/* Lightweight source-level locale switch. English is the default; add
   ?lang=zh to switch shared labels to Simplified Chinese. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var english = params.get('lang') !== 'zh';
  var common = {
    '🎪 回游戏乐园':'🎪 Game Lobby', '开始游戏 ▶':'Start Game ▶', '开始派对 🎉':'Start Party 🎉',
    '开始这一天 ▶':'Start the Day ▶', '开始闯关 🚀':'Start Adventure 🚀', '开始答题':'Start Quiz',
    '选一个你喜欢的小伙伴吧！':'Choose a friend', '给个提示':'Give me a hint', '今日任务':'Today\'s quest',
    '夸夸我':'Cheer me on', '关闭':'Close', '家长入口':'Parent area', '去完成':'Play now',
    '支持开发者（即将开放）':'Support the creator (coming soon)', '支持开发者':'Support the creator',
    '点屏幕跳跃！冲向终点！':'Tap to jump and reach the finish!', '点一下屏幕＝跳！空中再点一下＝跳得更高！':'Tap to jump; tap again in the air for a higher jump!',
    '电脑上按空格键也可以':'Press Space on desktop too', '回到「小小游戏乐园」':'Return to the game lobby',
    '要回到「小小游戏乐园」吗？进度会保存哦～':'Return to the game lobby? Your progress is saved.',
    '再来一次':'Play again', '下一关':'Next level', '暂停':'Pause', '继续':'Resume', '完成':'Done',
    '游戏结束':'Game Over', '恭喜通关':'You did it!', '还差一点点！':'Almost there!', '重新开始':'Restart'
    , 'AI 小伙伴':'AI Companion', '离线安全模式 · 仍可继续玩':'Offline safe mode · still playable',
    'GLM-5.3 Flash · 可选云端':'GLM-5.3 Flash · optional cloud', '连续天数':'Day streak', '鼓励星':'Stars', '游玩次数':'Sessions',
    '今日小任务':'Today\'s quest', '进度 ':'Progress ', '🔒 只发送游戏状态，不发送姓名、语音或聊天记录。家长可在站点首页查看支持方式。':'🔒 Only game state is sent. No names, voice, or chat history. Parents can see support options in the lobby.',
    '✨ 我会记住你的进步':'✨ I remember your progress', '🌟 今天也来一局':'🌟 One round today',
    '⛏️ 方块乐园':'⛏️ Block Park', '像我的世界一样，挖方块、盖房子！':'Dig blocks and build a tiny world!',
    '选一个小伙伴进入方块世界吧！':'Choose a friend for the block world!', '· 左右走、跳一跳，探索草地和山洞':'· Walk, jump, and explore fields and caves',
    '· 挖掉方块，或者放上喜欢的方块盖小房子':'· Dig blocks or place your favorites to build a home', '· 你搭的世界会自动保存，下次接着玩～':'· Your world saves automatically for next time',
    '进入世界 ▶':'Enter World ▶', '🌍 世界会自动保存 · 「重开」可以生成新世界':'🌍 Your world saves · “Reset” makes a new world'
    , '🎀 甜心乐园大冒险 🎀':'🎀 Sweet Adventure 🎀', '点击跳跃！收集甜点，跳过障碍，跑到终点彩虹门！':'Tap to jump, collect treats, dodge obstacles, and reach the rainbow gate!',
    '👆 点一下屏幕＝跳！空中再点一下＝跳得更高！':'👆 Tap to jump! Tap again in the air for a higher jump!', '⌨️ 电脑上按空格键也可以':'⌨️ Press Space on desktop too',
    '📜 米小圈历史大冒险 📜':'📜 History Time Quest 📜', '—— 帮米小圈写完历史作业吧！——':'— Help finish a history homework adventure! —',
    '米小圈："完蛋啦！魏老师留了作业——《我最喜欢的历史人物》，可我一个历史人物都不认识！😱':'Mickey: “Oh no! Our history homework is about a favorite historical person, and I do not know any! 😱',
    '铁头说他只认识孙悟空（那是神话啦！），姜小牙说历史书太贵他也没看……':'Titou only knows the Monkey King (that is a legend!), and Jiang has not read the book either…',
    '快跟我一起穿越时空，从远古一路玩到明清，每一关都有宝物收集哦！"':'Come travel from ancient times to the Ming and Qing eras. Every stage has a treasure!”',
    '出发穿越 🚀':'Start the time quest 🚀', '🏺 通关收集 8 件历史宝物 · 全部通关解锁「时空大挑战」赢金冠 👑':'🏺 Collect 8 history treasures · Clear all stages to unlock the time challenge 👑',
    '🎒 米小圈上学记':'🎒 A Day at School', '陪米小圈过热闹的一天！':'Spend a busy day at school!',
    '叮铃铃——闹钟响啦！今天是星期一，米小圈又赖床了。':'Ring ring—the alarm is ringing. It is Monday, and Mickey is still in bed.',
    '要经历起床、上学、上课、课间、午餐、美术、放学七件大事， 还会遇到铁头、姜小牙、李黎、魏老师和莫老师……':'Wake up, go to school, learn, play, eat lunch, make art, and go home with your friends and teachers…',
    '你能帮米小圈顺利过完这一天，晚上写出一篇日记吗？':'Can you help Mickey finish the day and write a diary tonight?', '🌟 会自动记住你玩到哪一关':'🌟 Your progress is saved automatically',
    '⛏️ 三丽鸥方块乐园':'⛏️ Block Park', '· 挖掉方块，或者放上喜欢的方块盖小房子':'· Dig blocks or place your favorites to build a home', '· 你搭的世界会自动保存，下次接着玩～':'· Your world saves automatically for next time',
    '🚩 米小圈闯关大冒险':'🚩 Platform Adventure', '—— 捡回课本，冲向学校！——':'— Collect the books and reach school! —',
    '出发闯关 🏃':'Start the adventure 🏃', '◀ ▶ 走路 · ⬆ 跳（空中再按一次＝二段跳）· 踩到大白鹅头上它会睡着哦':'◀ ▶ Move · ⬆ Jump (press again in the air for a double jump) · Stomp the goose to make it sleep',
    '🍓 甜甜消消乐 🍓':'🍓 Sweet Match 🍓', '—— 帮小美美做甜品派对！——':'— Help make a sweet party! —',
    '🍬 每关在步数内收集目标甜品 · 失败可以免费重来':'🍬 Collect the target sweets within the move limit · Retry for free',
    '小美美：':'Mimi:', '甜品派对马上开始啦！可是甜品还没凑齐……😿':'The sweet party is about to start, but we are still missing treats… 😿',
    '滑动':'Swipe ', '交换相邻的甜品，':'swap nearby treats, ', '三个连成一排':'match three in a row ', '就能收进篮子！':'and collect them!',
    '连出':'Match ', '4 个':'four ', '会变出条纹糖✨，':'to make a striped candy ✨, ', '5 个':'five ', '会变出彩虹糖🌈，超级厉害哦！':'to make a rainbow candy 🌈!',
    '🧁 甜品地图':'🧁 Sweet Map', '🎪 乐园':'🎪 Lobby', '← 地图':'← Map', '剩余步数':'Moves left', '滑动交换甜品，三连就能收集！':'Swap treats; match three to collect them!',
    '🎉 过关啦！':'🎉 Level clear!', '下一关 ▶':'Next level ▶', '再试一次 🔄':'Try again 🔄', '甜品地图 🗺️':'Sweet Map 🗺️',
    '🗺️ 时空地图':'🗺️ Time Map', '🏺 图鉴':'🏺 Collection', '🔊 读题':'🔊 Read question', '🎉 通关啦！获得宝物 🎉':'🎉 Clear! Treasure earned 🎉',
    '回地图 🗺️':'Back to map 🗺️', '大冒险完成！':'Adventure complete!', '看看我的宝物 🏺':'See my treasures 🏺', '🏺 宝物图鉴':'🏺 Treasure collection',
    '← 返回':'← Back', '跳过 ▶▶':'Skip ▶▶', '继续 ▶':'Continue ▶', '知道啦 ✓':'Got it ✓',
    '第1关':'Level 1', '休息一下 ☁️':'Take a break ☁️', '继续玩 ▶':'Keep playing ▶', '回到首页':'Back to home', '🌟 游戏结束 🌟':'🌟 Game over 🌟',
    '最高纪录：0':'Best score: 0', '再玩一次 🔄':'Play again 🔄', '回到首页 🏠':'Back to home 🏠', '🎪 回乐园':'🎪 Game Lobby',
    '场景':'Scenes', '📔 今天的日记':'📔 Today\'s diary', '回乐园':'Back to lobby', '再玩一次':'Play again',
    '⛏️ 挖掘':'⛏️ Dig', '🌱 重开':'🌱 Reset', '出发闯关 🏃':'Start the adventure 🏃', '🗺️ 闯关地图':'🗺️ Adventure map',
    '回选关地图':'Back to level map', '🏫 叮铃铃——赶上啦！':'🏫 Ring ring—we made it!', '你就是最棒的闯关小英雄！':'You are the best adventure hero!',
    '再丢课本就叫家长':'Lose the books again and I will call your parents',
    '星期一':'Monday', '起床、上学、上课、课间、午餐、美术、放学':'wake up, school, class, break, lunch, art, and home time'
  };
  function text(value) { return english && common[value] ? common[value] : value; }
  function translate(root) {
    if (!english) return;
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    var node;
    var keys = Object.keys(common).sort(function (a, b) { return b.length - a.length; });
    while ((node = walker.nextNode())) {
      var value = node.nodeValue.trim();
      for (var i = 0; i < keys.length; i += 1) {
        if (value.indexOf(keys[i]) >= 0) { node.nodeValue = node.nodeValue.replace(keys[i], common[keys[i]]); break; }
      }
    }
  }
  function switchUrl() {
    var next = new URL(location.href);
    if (english) next.searchParams.set('lang', 'zh'); else next.searchParams.delete('lang');
    return next.href;
  }
  function addToggle() {
    var button = document.createElement('button');
    button.className = 'kids-locale-toggle'; button.type = 'button'; button.textContent = english ? '中文' : 'EN';
    button.title = english ? 'Switch to Chinese' : 'Switch to English';
    button.addEventListener('click', function () { location.href = switchUrl(); });
    document.body.appendChild(button);
  }
  window.KidsLocale = { lang: english ? 'en' : 'zh', english: english, text: text, switchUrl: switchUrl, translate: translate };
  document.documentElement.lang = english ? 'en' : 'zh-CN';
  if (english) {
    var titleMeta = document.querySelector('meta[name="kids-game"]');
    var titleName = titleMeta && titleMeta.getAttribute('data-name-en');
    if (titleName) document.title = titleName;
    else if (document.title.indexOf('小小游戏乐园') >= 0 || document.title.indexOf('Kids Game Garden') >= 0) document.title = 'Kids Game Garden · Play a little each day';
  } else {
    var chineseMeta = document.querySelector('meta[name="kids-game"]');
    var chineseName = chineseMeta && chineseMeta.getAttribute('data-name');
    if (chineseName) document.title = chineseName;
    else if (document.title.indexOf('Kids Game Garden') >= 0) document.title = '小小游戏乐园 · 每天玩一点';
  }
  var style = document.createElement('style');
  style.textContent = '.kids-locale-toggle{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));z-index:10002;border:2px solid #fff;border-radius:999px;padding:8px 12px;background:#ffffffdf;color:#665a89;font:900 12px system-ui,sans-serif;box-shadow:0 5px 16px #5d4d8926;cursor:pointer}';
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { addToggle(); translate(document.body); });
  else { addToggle(); translate(document.body); }
  if (english && window.MutationObserver) new MutationObserver(function (records) { records.forEach(function (record) { record.addedNodes.forEach(function (node) { if (node.nodeType === 1) translate(node); }); }); }).observe(document.body, { childList: true, subtree: true });
}());
