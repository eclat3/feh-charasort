import { GAS_URL } from './firebase-config.js';

// グローバル
let chars = [];                 // 全キャラ情報
let charMap = new Map(); // id→キャラ情報 のマップ
let hexMap = new Map(); // hex+キャラ情報 のマップ
let rankings = [];             // 最終順位の ID リスト
let round = 0;                 // ラウンドカウンタ
let currentPool = [];  // 残り未処理キャラプール
let nextPool = []; // 次回の比較に用いるプール
let currentGroup = []; // 今回比較するグループID配列
let groupSize = 3; // currentGroup.length
let startTime;

// 敗北情報: map<charId, Set<opponentId>>
const losses = new Map();

/** 初期化: characters.json 読込 */
function init() {
    return fetch('characters.json')
        .then(r => r.json())
        .then(data => {
        chars = data;
        charMap = new Map(chars.map(c => [c.id, c]));
        hexMap  = new Map(chars.map(c => [c.hex, c]));
        });
}

/** ソート開始 */
function startSorting() {
    startTime = Date.now();
    round = 1;
    // ラウンド1: 全キャラを pool に登録
    currentPool = chars.map(c => c.id);
    nextRound();
}

function nextRound() {
    round++;
    if (rankings.length === chars.length) return finish();
  
    // １人残りなら確定して再帰
    if (currentPool.length === 1) {
      rankings.push(currentPool[0]);
      currentPool = getLosersOf(currentPool[0]);
      return nextRound();
    }
  
    // それ以外はグループを順次作っていく
    if (currentPool.length > 0) {
      nextGroup();
    } else {
      // プールが尽きたら次ラウンドへ
      currentPool = [...nextPool];
      nextPool = [];
      return nextRound();
    }
  }
  
function nextGroup() {
    const poolSize = currentPool.length;
    if (poolSize === 0) return nextRound();
    else if (poolSize < 3) groupSize = poolSize;
    else if (poolSize % 3 === 1) groupSize = 2;
    else groupSize = 3;
    currentGroup = currentPool.splice(0, groupSize);
    renderGroup(currentGroup);
}

/** グループ表示 */
function renderGroup(group) {
    clearSelection();
    const area = document.getElementById('sort-area');
    area.innerHTML = '';
    group.forEach(id => {
        const info = charMap.get(id);
        const div = document.createElement('div');
        div.className = 'char-card'; div.dataset.id = id;
        div.innerHTML = `<img src='${info.img}' alt='${info.name}' onerror="this.parentNode.classList.add('placeholder')"><p>${info.name}</p>`;
        div.onclick = () => selectRank(div, group.length);
        area.append(div);
    });
}

/** ランク選択 */
function selectRank(el, size) {
    const s1 = document.querySelector('.selected1');
    const s2 = document.querySelector('.selected2');
    if (!s1) return el.classList.add('selected1');
    if (size === 3 && !s2 && el !== s1) return el.classList.add('selected2');
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
    const s2 = document.querySelector('.selected2');
    
    if (!s1) {
      alert('まず1位を選択');
      return;
    }
    if (currentGroup.length === 3 && !s2) {
      alert('2位を選択');
      return;
    }
    
    const id1 = +s1.dataset.id;
    recordLosses(currentGroup, id1);
    nextPool.push(id1);
    
    if (currentGroup.length === 3) {
      const id2 = +s2.dataset.id;
      recordLosses(currentGroup.filter(id => id !== id1), id2);
    }
    
    nextGroup();
}

/** 負け情報記録 */
function recordLosses(losers, winnerId) {
    losers.forEach(loserId => {
        if (loserId === winnerId) return;
        losses.set(loserId, winnerId);
    });
}

/** 特定キャラに負けた集合 */
function getLosersOf(id) {
    const arr = [];
    losses.forEach((winnerId, loserId) => {
        if (winnerId === id) arr.push(loserId);
    });
    return arr;
}

/** 完了処理: GAS送信→結果画面へ */
async function finish() {
    const datetime = Date.now();
    const playTime = Math.floor((Date.now() - startTime) / 1000);
    const hex = rankings
        .map(id => charMap.get(id).hex)
        .join('');
    try {
        await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({playTime, resultHex: hex })
        });
    } catch (e) {
        console.error('Failure to send data', e);
        // 今後必要に応じて処理を追加
    } finally {
        location.href = `result.html?result=${hex}`;
    }
}

/** 結果画面レンダー */
function renderResult() {
    const hex = new URLSearchParams(location.search).get('result') || '';
    const ul  = document.getElementById('result-list');
    for (let i = 0; i < hex.length; i += 2) {
        const code = hex.slice(i, i + 2);
        const data = hexMap.get(code);
        const li   = document.createElement('li');
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
    if (location.pathname.endsWith('result.html')) {
      renderResult();
    } else {
      startSorting();
    }

    // ボタン要素取得
    const btnSubmit = document.getElementById('submit-rank');
    const btnReset = document.getElementById('reset-rank');
    const btnRetire = document.getElementById('retire');
    const btnRestart = document.getElementById('restart');
    const btnShare = document.getElementById('share');

    // イベント登録
    if (btnSubmit)  btnSubmit.onclick  = submitRank;
    if (btnReset)   btnReset.onclick   = clearSelection;
    if (btnRetire)  btnRetire.onclick  = () => { if (confirm('途中終了しますか？')) finish(); };
    if (btnRestart) btnRestart.onclick = () => { location.href = 'index.html'; };
    if (btnShare)   btnShare.onclick   = () => { prompt('共有用URL', location.href); };
  });
});
