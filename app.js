import { GAS_URL } from './firebase-config.js';

let chars = [];
let testedSets = new Set();
let rankings = [];
let currentGroup = [];
let startTime;

// 勝敗記録構造体（トーナメント用）
const results = {
  lossTo: new Map(), // charId -> Set of charIds it lost to
};

// 初期化
function init() {
  return fetch('characters.json')
    .then(r => r.json())
    .then(data => { chars = data; });
}

// メインページ：ソート開始
function startSorting() {
  startTime = Date.now();
  prepareNextGroup();
}

// トーナメント方式：次グループ決定
function prepareNextGroup() {
  // 未確定キャラリスト
  const pool = chars.map(c => c.id).filter(id => !rankings.includes(id));
  // 初回はラウンド１、以降は勝者同士で再グループ化
  let groupIds;
  if (rankings.length === 0) {
    groupIds = sampleGroup(pool);
  } else {
    const lastWinners = pool.filter(id => {
      const losers = results.lossTo.get(id) || new Set();
      return !losers.size; // まだ負けていないキャラ
    });
    groupIds = sampleGroup(lastWinners);
  }
  currentGroup = chars.filter(c => groupIds.includes(c.id));
  renderGroup();
}

// 3人 or 2人のグループ取り出し
function sampleGroup(arr) {
  if (arr.length <= 2) return arr.slice();
  const mod = arr.length % 3;
  const size = (mod === 1 ? 2 : 3);
  let group;
  do {
    group = shuffle(arr).slice(0, size);
  } while (testedSets.has(key(group)));
  testedSets.add(key(group));
  return group;
}

// グループ表示
function renderGroup() {
  clearSelection();
  const area = document.getElementById('sort-area');
  area.innerHTML = '';
  currentGroup.forEach(c => {
    const div = document.createElement('div');
    div.className = 'char-card';
    div.dataset.id = c.id;
    const img = document.createElement('img'); img.src = c.img;
    img.onerror = () => div.classList.add('placeholder');
    const p = document.createElement('p'); p.textContent = c.name;
    div.append(img, p);
    div.onclick = () => selectRank(div);
    area.append(div);
  });
}

// 選択／解除
function selectRank(el) {
  const first = document.querySelector('.selected1');
  const second = document.querySelector('.selected2');
  if (!el.classList.contains('selected1') && !el.classList.contains('selected2')) {
    if (!first) el.classList.add('selected1');
    else if (!second && currentGroup.length === 3) el.classList.add('selected2');
  } else {
    if (el.classList.contains('selected2')) el.classList.remove('selected2');
    else if (el.classList.contains('selected1')) el.classList.remove('selected1');
  }
}

function clearSelection() {
  document.querySelectorAll('.selected1, .selected2')
    .forEach(e => e.classList.remove('selected1','selected2'));
}

// 順位確定：1位→2位で敗北情報記録、次グループへ
function submitRank() {
  const s1 = document.querySelector('.selected1');
  if (!s1) return alert('まず1位を選択');
  const id1 = +s1.dataset.id; rankings.push(id1);
  const losers = currentGroup.map(c => c.id).filter(id=>id!==id1);
  losers.forEach(id => recordLoss(id, id1));
  if (currentGroup.length === 3) {
    const s2 = document.querySelector('.selected2');
    if (!s2) return alert('2位を選択');
    const id2 = +s2.dataset.id; rankings.push(id2);
    const loser3 = currentGroup.map(c=>c.id).find(id=>id!==id1&&id!==id2);
    recordLoss(loser3, id2);
  }
  // 全体順位決定済なら終了
  if (rankings.length >= chars.length) showResult();
  else prepareNextGroup();
}

function recordLoss(loser, winner) {
  if (!results.lossTo.has(loser)) results.lossTo.set(loser, new Set());
  results.lossTo.get(loser).add(winner);
}

// 結果ページ描画
function renderResult() {
  const params = new URLSearchParams(location.search);
  const hex = params.get('result') || '';
  const res = [];
  for (let i=0; i<hex.length; i+=2) {
    const h = hex.slice(i,i+2);
    const c = chars.find(c=>c.hex===h);
    if (c) res.push(c);
  }
  const ul = document.getElementById('result-list');
  res.forEach((c,i)=>{
    const li=document.createElement('li');
    li.textContent = `${i+1}位 ${c.name}`;
    if (i<10){ const img=document.createElement('img'); img.src=c.img; li.append(img); }
    ul.append(li);
  });
}

// GAS送信 & ページ遷移
function showResult() {
  const playTime = Math.floor((Date.now()-startTime)/1000);
  const hex = rankings.map(id=>chars.find(c=>c.id===id).hex).join('');
  fetch(GAS_URL,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({playTime,resultHex:hex})});
  location.href = `result.html?result=${hex}`;
}

// イベントバインド
window.addEventListener('DOMContentLoaded', () => {
  init().then(()=>{
    if (location.pathname.endsWith('result.html')) renderResult();
    else startSorting();
  });
  document.getElementById('submit-rank')?.addEventListener('click', submitRank);
  document.getElementById('reset-rank')?.addEventListener('click', clearSelection);
  document.getElementById('retire')?.addEventListener('click', ()=> confirm('途中終了しますか？') && showResult());
  document.getElementById('restart')?.addEventListener('click', ()=> location.href='index.html');
  document.getElementById('share')?.addEventListener('click', ()=> prompt('共有用URL',location.href));
});

function shuffle(a){return a.sort(()=>Math.random()-.5);}  
function key(arr){return arr.slice().sort().join('-');}
