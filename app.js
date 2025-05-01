import { GAS_URL } from './firebase-config.js';

// グローバル
let chars = [];                 // 全キャラ情報
let rankings = [];             // 最終順位の ID リスト
let round = 0;                 // ラウンドカウンタ
let currentPool = [];          // 今回比較対象 ID の配列
let startTime;

// 敗北情報: map<charId, Set<opponentId>>
const losses = new Map();

/** 初期化: characters.json 読込 */
function init() {
  return fetch('characters.json')
    .then(r => r.json())
    .then(data => { chars = data; });
}

/** ソート開始 */
function startSorting() {
  startTime = Date.now();
  round = 1;
  // ラウンド1: 全キャラを pool に登録
  currentPool = chars.map(c => c.id);
  nextRound();
}

/** 次ラウンド: currentPool から 2～3 人ずつ取り出し表示 */
function nextRound() {
  // N=人数
  const N = currentPool.length;
  if (N === 1) {
    // そのまま確定
    rankings.push(currentPool[0]);
    currentPool = getLosersOf(currentPool[0]);
    round++;
    return nextRound();
  }
  // 決定戦: 2 or 3 人グループ
  let groupSize;
  if (N % 3 === 1) groupSize = 2;
  else groupSize = 3;
  const group = currentPool.splice(0, groupSize);
  renderGroup(group);
}

/** グループ表示 */
function renderGroup(group) {
  clearSelection();
  const area = document.getElementById('sort-area');
  area.innerHTML = '';
  group.forEach(id => {
    const info = chars.find(c => c.id === id);
    const div = document.createElement('div');
    div.className = 'char-card'; div.dataset.id = id;
    div.innerHTML = `<img src='${info.img}' alt='${info.name}' onerror="this.parentNode.classList.add('placeholder')"><p>${info.name}</p>`;
    div.onclick = () => selectRank(div, group.length);
    area.append(div);
  });
}

/** ランク選択 */
function selectRank(el, poolSize) {
  const s1 = document.querySelector('.selected1');
  const s2 = document.querySelector('.selected2');
  if (!s1) return el.classList.add('selected1');
  if (poolSize === 3 && !s2 && el !== s1) return el.classList.add('selected2');
  // クリックで解除
  if (el.classList.contains('selected2')) el.classList.remove('selected2');
  else if (el.classList.contains('selected1')) el.classList.remove('selected1');
}

/** 選択解除 */
function clearSelection() {
  document.querySelectorAll('.selected1, .selected2')
    .forEach(e => e.classList.remove('selected1','selected2'));
}

/** 決定ボタン */
function submitRank() {
  const s1 = document.querySelector('.selected1');
  if (!s1) return alert('まず1位を選択');
  const id1 = +s1.dataset.id;
  recordLosses(currentPool, id1);
  rankings.push(id1);
  if (currentPool.length === 3) {
    const s2 = document.querySelector('.selected2');
    if (!s2) return alert('2位を選択');
    const id2 = +s2.dataset.id;
    recordLosses(currentPool.filter(id=>id!==id1), id2);
    rankings.push(id2);
    // 残り 3 位以下はプールに残す
    currentPool = currentPool.filter(id=>id!==id1&&id!==id2);
  } else {
    // 2 人グループなら残り 1 人を敗者として記録
    const loser = currentPool.find(id=>id!==id1);
    recordLosses([loser], id1);
    // 残りは losers for next
    currentPool = [loser];
  }
  // 次ラウンド pool を再設定
  if (currentPool.length === 0) {
    // 今回全員順位つけ終わり: 次に敗者集合で再度同様に
    currentPool = Array.from(losses.keys()).filter(id => !rankings.includes(id));
    round++;
  }
  // 最終判定
  if (rankings.length === chars.length) return finish();
  nextRound();
}

/** 負け情報記録 */
function recordLosses(losers, winner) {
  losers.forEach(loser => {
    if (loser === winner) return;
    if (!losses.has(loser)) losses.set(loser, new Set());
    losses.get(loser).add(winner);
  });
}

/** 特定キャラに負けた集合 */
function getLosersOf(id) {
  const arr = [];
  losses.forEach((set, loserId) => {
    if (set.has(id)) arr.push(loserId);
  });
  return arr;
}

/** 完了処理: GAS送信→結果画面へ */
function finish() {
  const playTime = Math.floor((Date.now()-startTime)/1000);
  const hex = rankings.map(id=>chars.find(c=>c.id===id).hex).join('');
  fetch(GAS_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({playTime,resultHex:hex}) });
  location.href = `result.html?result=${hex}`;
}

/** 結果画面レンダー */
function renderResult() {
  const hex = new URLSearchParams(location.search).get('result') || '';
  const ul = document.getElementById('result-list');
  for (let i=0;i<hex.length;i+=2) {
    const data = chars.find(c=>c.hex===hex.slice(i,i+2));
    const li = document.createElement('li');
    li.textContent = `${ul.children.length+1}位 ${data.name}`;
    if (ul.children.length<10) {
      const img = document.createElement('img'); img.src=data.img;
      li.append(img);
    }
    ul.append(li);
  }
}

// イベント
window.addEventListener('DOMContentLoaded', () => {
  init().then(() => {
    if (location.pathname.endsWith('result.html')) renderResult();
    else startSorting();
  });
  document.getElementById('submit-rank')?.onclick = submitRank;
  document.getElementById('reset-rank')?.onclick = clearSelection;
  document.getElementById('retire')?.onclick = () => confirm('途中終了しますか？') && finish();
  document.getElementById('restart')?.onclick = () => location.href='index.html';
  document.getElementById('share')?.onclick = () => prompt('共有用URL', location.href);
});
