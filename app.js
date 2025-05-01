import { GAS_URL } from './firebase-config.js';

let chars = [];
let testedSets = new Set();
let rankings = [];
let currentGroup = [];
let startTime;

function init() {
  fetch('characters.json')
    .then(r => r.json())
    .then(data => { chars = data; startTime = Date.now(); nextRound(); });
}

function nextRound() {
  // プールの算出
  const pool = chars.filter(c => !rankings.includes(c.id));
  // グループサイズ決定
  let size;
  if (pool.length <= 2) {
    size = pool.length;
  } else if (pool.length % 3 === 1) {
    size = 2;
  } else {
    size = 3;
  }
  // 組み合わせ重複防止ループ
  let group;
  do {
    group = shuffle(pool).slice(0, size);
  } while (testedSets.has(key(group)));
  currentGroup = group;
  testedSets.add(key(group));
  renderGroup();
}

function renderGroup() {
  clearSelection();
  const area = document.getElementById('sort-area');
  area.innerHTML = '';
  currentGroup.forEach(c => {
    const div = document.createElement('div');
    div.className = 'char-card';
    div.dataset.id = c.id;
    const img = document.createElement('img');
    img.src = c.img;
    img.alt = c.name;
    img.onerror = () => div.classList.add('placeholder');
    const p = document.createElement('p');
    p.textContent = c.name;
    div.append(img, p);
    div.onclick = () => selectRank(div);
    area.append(div);
  });
}

function selectRank(el) {
  const first = document.querySelector('.char-card.selected1');
  const second = document.querySelector('.char-card.selected2');
  if (!el.classList.contains('selected1') && !el.classList.contains('selected2')) {
    // 未選択状態
    if (!first) {
      el.classList.add('selected1');
    } else if (!second && currentGroup.length === 3) {
      el.classList.add('selected2');
    }
  } else {
    // 既に選択済: クリックで解除
    if (el.classList.contains('selected2')) {
      el.classList.remove('selected2');
    } else if (el.classList.contains('selected1')) {
      // 1位解除時は2位を1位に繰り上げず、そのままクリア
      el.classList.remove('selected1');
    }
  }
}

function clearSelection() {
  document.querySelectorAll('.char-card.selected1, .char-card.selected2')
    .forEach(el => el.classList.remove('selected1', 'selected2'));
}

function submitRank() {
  const s1 = document.querySelector('.char-card.selected1');
  if (!s1) return alert('まず1位を選択してください');
  rankings.push(+s1.dataset.id);
  if (currentGroup.length === 3) {
    const s2 = document.querySelector('.char-card.selected2');
    if (!s2) return alert('2位を選択してください');
    rankings.push(+s2.dataset.id);
  }
  nextRound();
}

function showResult() {
  const endTime = Date.now();
  const playTime = Math.floor((endTime - startTime) / 1000);
  const hex = rankings.map(id => chars.find(c => c.id === id).hex).join('');
  fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playTime, resultHex: hex })
  });
  location.href = `result.html?result=${hex}`;
}

// イベント設定
window.onload = () => {
  if (location.pathname.endsWith('result.html')) {
    init();
    renderResult();
  } else {
    init();
    document.getElementById('submit-rank').onclick = submitRank;
    document.getElementById('reset-rank').onclick = clearSelection;
    document.getElementById('retire').onclick = () => {
      if (confirm('途中終了しますか？')) showResult();
    };
  }
  document.getElementById('restart')?.addEventListener('click', () => location.href = 'index.html');
  document.getElementById('share')?.addEventListener('click', () => prompt('この URL を共有', location.href));
};

function renderResult() {
  const params = new URLSearchParams(location.search);
  const hexstr = params.get('result') || '';
  const res = [];
  for (let i = 0; i < hexstr.length; i += 2) {
    const h = hexstr.slice(i, i + 2);
    const c = chars.find(c => c.hex === h);
    if (c) res.push(c);
  }
  const ul = document.getElementById('result-list');
  res.forEach((c, i) => {
    const li = document.createElement('li');
    li.textContent = `${i+1}位 ${c.name}`;
    if (i < 10) {
      const img = document.createElement('img');
      img.src = c.img;
      li.append(img);
    }
    ul.append(li);
  });
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
function key(group) { return group.map(c => c.id).sort().join('-'); }
