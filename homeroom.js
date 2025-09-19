// 담임 페이지 전용 JavaScript

import { $, $$, todayKey, fmtClassNo, loadRosterFromJSON, firebaseConfig } from './common.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(location.search);
const dateParam = params.get('date') || todayKey();

// ===== 담임(출석/미참석 표) =====
async function renderTeacher() {
  const container = document.createElement('div');
  container.className = 'card';
  const dateKey = dateParam;
  container.innerHTML = `
    <div class="row" style="justify-content:space-between;align-items:end">
      <div style="flex:1 1 240px"><label>담임 반 (1~10)</label><select id="klass"></select></div>
      <div style="flex:1 1 240px"><label>날짜</label><input id="dateInput" type="date" /></div>
      <div style="flex:0 0 auto"><button class="ghost" id="load">불러오기</button></div>
    </div>
    <div id="result" style="margin-top:14px">
      <p class="muted">반을 선택하고 '불러오기' 버튼을 클릭하여 출석 현황을 확인하세요.</p>
    </div>`;
  document.querySelector('main').appendChild(container);

  const klassSel = $('#klass', container);
  for (let i = 1; i <= 10; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${i}반`;
    klassSel.appendChild(o);
  }
  $('#dateInput', container).value = dateKey;
  $('#load', container).addEventListener('click', () => load());

  let roster = {};
  let maxNumbers = {};
  
  loadRosterFromJSON().then(data => {
    roster = data.roster;
    maxNumbers = data.maxNumbers;
    // 명단 로드 완료 - 사용자가 불러오기 버튼을 눌러야 데이터 표시
  });

  async function load() {
    const k = Number(klassSel.value || 1);
    const dateKey = $('#dateInput', container).value;
    const res = $('#result', container);
    res.innerHTML = '<p class="muted">불러오는 중…</p>';
    
    try {
      const snapshot = await getDocs(collection(db, 'checkins', dateKey, 'seats'));
      const bySeat = {};
      snapshot.forEach((doc) => {
        const seat = doc.id;
        bySeat[seat] = doc.data();
      });
      
      const present = new Set(Object.values(bySeat).filter(v => v.class === k).map(v => Number(v.number)));
      const names = roster?.[k] || {};
      const maxNum = maxNumbers?.[k] || 0; // 해당 반의 최대 번호
      
      let html = `<h3 style="margin:8px 0">${dateKey} · ${k}반 출결 (총 ${maxNum}명)</h3>`;
      html += '<table><thead><tr><th>번호</th><th>이름</th><th>참석 여부</th></tr></thead><tbody>';
      
      // 해당 반의 최대 번호까지만 반복
      for (let n = 1; n <= maxNum; n++) {
        const nm = names?.[n] || '';
        const ok = present.has(n);
        html += `<tr><td>${n}</td><td>${nm || '-'}</td><td style="color:${ok ? '#16a34a' : '#ef4444'}">${ok ? '참석' : '미참석'}</td></tr>`;
      }
      html += '</tbody></table>';
      res.innerHTML = html;
    } catch (error) {
      console.error('출석 데이터 로드 실패:', error);
      res.innerHTML = '<p class="error">불러오기 실패 (권한/규칙 또는 네트워크 확인)</p>';
    }
  }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const header = document.createElement('header');
  header.innerHTML = `<h1>담임 조회 (출석 현황)</h1>`;
  document.body.appendChild(header);
  
  const main = document.createElement('main');
  document.body.appendChild(main);

  // 비밀번호 확인
  const pass = prompt('담임 비밀번호를 입력하세요');
  if (pass !== 'honey') {
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = '<p class="error">비밀번호가 올바르지 않습니다.</p>';
    main.appendChild(c);
  } else {
    renderTeacher();
  }
});
