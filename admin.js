// 관리자 페이지 전용 JavaScript

import { $, $$, todayKey, fmtClassNo, loadRosterFromJSON, firebaseConfig } from './common.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(location.search);
const dateParam = params.get('date') || todayKey();

// ===== 관리자(좌석판) =====
async function renderAdmin() {
  const container = document.createElement('div');
  container.className = 'card';
  const dateKey = dateParam || todayKey();
  container.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <strong>${dateKey}</strong> 좌석 현황
          <div id="attendanceCounter" class="pill" style="background:rgba(34, 197, 94, 0.2);border-color:rgba(34, 197, 94, 0.4);color:var(--good);font-weight:600">
            출석: <span id="attendanceCount">0</span>명
          </div>
        </div>
        <div class="legend">
          <span class="pill"><span style="width:10px;height:10px;border-radius:50%;background:rgba(34, 197, 94, 0.8);display:inline-block"></span> 체크됨</span>
          <span class="pill"><span style="width:10px;height:10px;border-radius:50%;background:var(--line);display:inline-block"></span> 비어있음</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="dateInput" type="date" />
        <button class="ghost" id="reload">새로고침</button>
      </div>
    </div>
    <div class="grid-container">
      <div id="grid" class="grid"></div>
      <div class="block-gap"></div>
      <div id="grid2" class="grid"></div>
      <div class="block-gap-large"></div>
      <div id="grid3" class="grid"></div>
      <div class="block-gap"></div>
      <div id="grid4" class="grid"></div>
    </div>
    <p class="muted" style="margin-top:10px">좌석을 클릭하면 비우거나(삭제) 상세 정보를 볼 수 있습니다. 가로 스크롤을 사용하세요.</p>
  `;
  document.querySelector('main').appendChild(container);

  const grid = $('#grid', container);
  const grid2 = $('#grid2', container);
  const grid3 = $('#grid3', container);
  const grid4 = $('#grid4', container);
  const dateInput = $('#dateInput', container);

  dateInput.value = dateKey;

  // 좌석 생성
  function makeSeat(i) {
    const d = document.createElement('div');
    d.className = 'seat free';
    d.dataset.seat = String(i);
    d.innerHTML = `
      <div class="seatHeader">#${i}</div>
      <div class="name muted">-</div>
      <div class="class-info muted">-</div>
    `;
    return d;
  }

  // 1-25번 좌석을 첫 번째 그리드에, 26-50번 좌석을 두 번째 그리드에 배치
  // 51-75번 좌석을 세 번째 그리드에, 76-100번 좌석을 네 번째 그리드에 배치
  for (let i = 1; i <= 25; i++) {
    grid.appendChild(makeSeat(i));
  }
  for (let i = 26; i <= 50; i++) {
    grid2.appendChild(makeSeat(i));
  }
  for (let i = 51; i <= 75; i++) {
    grid3.appendChild(makeSeat(i));
  }
  for (let i = 76; i <= 100; i++) {
    grid4.appendChild(makeSeat(i));
  }

  let roster = {};
  loadRosterFromJSON().then(data => {
    roster = data.roster;
  });
  
  // 계층 구조에서 데이터 읽기: checkins/날짜/seats/좌석번호
  onSnapshot(
    collection(db, 'checkins', dateKey, 'seats'),
    (snapshot) => {
      const checkins = {};
      snapshot.forEach((doc) => {
        const seat = doc.id;
        checkins[seat] = doc.data();
      });
      draw(checkins);
    },
    (error) => {
      console.error('onSnapshot error:', error);   // permission-denied 등 확인
    }
  );

  function draw(checkins) {
    let attendanceCount = 0; // 출석한 학생 수 카운터
    
    [...$$('.seat', grid), ...$$('.seat', grid2), ...$$('.seat', grid3), ...$$('.seat', grid4)].forEach(cell => {
      const seat = cell.dataset.seat;
      const item = checkins[seat];
      
      if (item) {
        attendanceCount++; // 출석한 학생 수 증가
        const nm = item.name || roster?.[item.class]?.[item.number] || '';
        cell.classList.remove('free');
        cell.classList.add('occupied'); // 학생이 있는 자리 표시
        
        // 좌석 번호는 그대로 유지
        cell.querySelector('.seatHeader').textContent = `#${seat}`;
        
        // 이름 표시
        cell.querySelector('.name').textContent = nm || '(이름없음)';
        cell.querySelector('.name').classList.remove('muted');
        
        // 반, 번호 정보 표시
        cell.querySelector('.class-info').textContent = `${item.class}반 ${item.number}번`;
        cell.querySelector('.class-info').classList.remove('muted');
      } else {
        cell.classList.add('free');
        cell.classList.remove('occupied'); // 비어있는 자리 표시
        
        // 좌석 번호는 그대로 유지
        cell.querySelector('.seatHeader').textContent = `#${seat}`;
        
        // 비어있을 때는 이름과 반 정보를 숨김
        cell.querySelector('.name').textContent = '';
        cell.querySelector('.name').classList.add('muted');
        
        cell.querySelector('.class-info').textContent = '';
        cell.querySelector('.class-info').classList.add('muted');
      }
    });
    
    // 출석 카운터 업데이트
    const counterElement = $('#attendanceCount', container);
    if (counterElement) {
      counterElement.textContent = attendanceCount;
    }
  }

  grid.addEventListener('click', seatClick);
  grid2.addEventListener('click', seatClick);
  grid3.addEventListener('click', seatClick);
  grid4.addEventListener('click', seatClick);
  
  async function seatClick(e) {
    const cell = e.target.closest('.seat');
    if (!cell) return;
    const seat = cell.dataset.seat;
    
    try {
      const docSnap = await getDoc(doc(db, 'checkins', dateKey, 'seats', String(seat)));
      if (!docSnap.exists()) return alert(`#${seat} 빈 좌석입니다.`);
      
      const v = docSnap.data();
      const nm = v.name || roster?.[v.class]?.[v.number] || '';
      const ok = confirm(`#${seat} ${fmtClassNo(v.class, v.number)} ${nm}\n이 좌석을 비우시겠습니까?`);
      
      if (ok) {
        await deleteDoc(doc(db, 'checkins', dateKey, 'seats', String(seat)));
      }
    } catch (error) {
      console.error('좌석 삭제 실패:', error);
      alert('좌석 삭제 중 오류가 발생했습니다.');
    }
  }

  $('#reload', container).addEventListener('click', () => {
    const base = location.href.split('?')[0];
    location.href = `${base}?date=${dateInput.value}`;
  });
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const header = document.createElement('header');
  header.innerHTML = `<h1>자율학습 좌석 현황 (관리자)</h1>`;
  document.body.appendChild(header);
  
  const main = document.createElement('main');
  document.body.appendChild(main);
  
  renderAdmin();

  // 비밀번호 확인
  const pass = prompt('비밀번호를 입력하세요');
  if (pass !== 'honey') {
    const c = document.createElement('div');
    c.className = 'card';
    c.innerHTML = '<p class="error">비밀번호가 올바르지 않습니다.</p>';
    main.appendChild(c);
  } else {
    renderTeacher();
  }
});

