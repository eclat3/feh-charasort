import { GAS_URL } from './firebase-config.js'; // GAS のエンドポイント

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
  const sel = document.querySelectorAll('.char-card.selected1, .char-card.selected2');
  if (!el.classList.contains('selected1')) {
    if (sel.length === 0) el.classList.add('selected1');
    else if (sel.length === 1) el.classList.add('selected2');
  } else {
    el.classList.remove('selected1', 'selected2');
  }
}

function submitRank() {
  const s1 = document.querySelector('.selected1');
  if (!s1) return alert('まず1位を選択してください');
  rankings.push(+s1.dataset.id);
  if (currentGroup.length === 3) {
    const s2 = document.querySelector('.selected2');
    if (!s2) return alert('2位を選択してください');
    rankings.push(+s2.dataset.id);
  }
  nextRound();
}

function showResult() {
  const endTime = Date.now();
  const playTime = Math.floor((endTime - startTime) / 1000);
  const hex = rankings.map(id => chars.find(c => c.id === id).hex).join('');
  // GAS に結果を送信
  fetch(GAS_URL, {
    method: 'POST',
    contentType: 'application/json',
    body: JSON.stringify({ playTime, resultHex: hex })
  });
  location.href = `result.html?result=${hex}`;
}

document.getElementById('submit-rank').onclick = submitRank;
document.getElementById('reset-rank').onclick = nextRound;
document.getElementById('retire').onclick = () => {
  if (confirm('途中終了しますか？')) showResult();
};

document.getElementById('restart')?.addEventListener('click', () => location.href = 'index.html');
document.getElementById('share')?.addEventListener('click', () => prompt('この URL を共有', location.href));

if (location.pathname.endsWith('result.html')) window.onload = renderResult;
else window.onload = init;

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
      ul.append(li);
      li.append(img);
    } else ul.append(li);
  });
}

function shuffle(a) { return a.sort(() => Math.random() - .5); }
function key(group) { return group.map(c => c.id).sort().join('-'); }
