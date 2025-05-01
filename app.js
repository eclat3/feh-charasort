let chars = [];
let testedSets = new Set();
let rankings = [];
let currentGroup = [];

// URL パラメータから結果を読込／初期化
function init() {
  fetch('characters.json')
    .then(r => r.json())
    .then(data => { chars = data; nextRound(); });
}

function nextRound() {
  // 組み合わせサンプリング（3人または2人）
  const pool = chars.filter(c => !rankings.includes(c.id));
  const mod = pool.length % 3;
  const size = (mod === 2 || pool.length <= 2) ? 2 : 3;
  let group;
  do {
    group = shuffle(pool).slice(0, size);
  } while (testedSets.has(key(group)));
  currentGroup = group;
  testedSets.add(key(group));
  renderGroup();
}

function renderGroup() {
  const area = document.getElementById('sort-area');
  area.innerHTML = '';
  currentGroup.forEach((c,i) => {
    const div = document.createElement('div');
    div.className = 'char-card';
    div.dataset.id = c.id;
    div.innerHTML = `<img src="${c.img}" alt="${c.name}"><p>${c.name}</p>`;
    div.onclick = () => selectRank(div);
    area.append(div);
  });
}

function selectRank(el) {
  const sel = document.querySelectorAll('.char-card.selected1, .char-card.selected2');
  if (!el.classList.contains('selected1')) {
    if (sel.length === 0) el.classList.add('selected1');
    else if (sel.length === 1) el.classList.add('selected2');
  } else {
    el.classList.remove('selected1', 'selected2');
  }
}

// 確定
function submitRank() {
  const s1 = document.querySelector('.selected1');
  const s2 = document.querySelector('.selected2');
  if (!s1) return alert('まず1位を選択してください');
  const id1 = +s1.dataset.id;
  rankings.push(id1);
  if (currentGroup.length === 3) {
    if (!s2) return alert('2位も選択してください');
    const id2 = +s2.dataset.id;
    rankings.push(id2);
  }
  nextRound();
}

document.getElementById('submit-rank').onclick = submitRank;
document.getElementById('reset-rank').onclick = nextRound;
document.getElementById('retire').onclick = showResult;

function showResult() {
  // 結果 URL パラメータに埋め込み
  const hex = rankings.map(id => chars.find(c=>c.id===id).hex).join('');
  location.href = `result.html?result=${hex}`;
}

// 結果画面処理
function renderResult() {
  const params = new URLSearchParams(location.search);
  const hexstr = params.get('result') || '';
  const resIds = [];
  for (let i=0; i<hexstr.length; i+=2) {
    const h = hexstr.slice(i,i+2);
    const c = chars.find(c=>c.hex===h);
    if (c) resIds.push(c);
  }
  const ul = document.getElementById('result-list');
  resIds.forEach((c,i) => {
    const li = document.createElement('li');
    li.textContent = `${i+1}位 ${c.name}`;
    if (i < 10) {
      const img = document.createElement('img'); img.src = c.img;
      li.append(img);
    }
    ul.append(li);
  });
  document.getElementById('restart').onclick = () => location.href = 'index.html';
  document.getElementById('share').onclick = () => prompt('この URL を共有', location.href);
}

if (location.pathname.endsWith('result.html')) {
  init(); // characters 読込後
  window.onload = renderResult;
} else {
  init();
}

// ユーティリティ
function shuffle(a) { return a.sort(()=>Math.random()-.5); }
function key(group) { return group.map(c=>c.id).sort().join('-'); }
