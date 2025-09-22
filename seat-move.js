// 좌석 이동 페이지 전용 JavaScript

import { $, $$, todayKey, fmtClassNo, loadRosterFromJSON, firebaseConfig } from './common.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== 좌석 이동 페이지 =====
async function renderSeatMove() {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);padding:8px 16px;border-radius:20px;color:white;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(245, 158, 11, 0.3)">
        🔄 좌석 이동 요청
      </div>
    </div>
    
    <div class="row" style="margin-bottom:16px">
      <div style="flex:0 0 180px">
        <label>반 (1~10)</label>
        <select id="klass">
          <option value="">반을 선택하세요</option>
        </select>
      </div>
      <div style="flex:0 0 180px">
        <label>번호</label>
        <select id="number">
          <option value="">번호를 선택하세요</option>
        </select>
      </div>
      <div style="flex:0 0 350px">
        <label>이름</label>
        <input id="name" type="text" placeholder="반과 번호를 선택하면 자동으로 불러옵니다" readonly />
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:end">
        <button class="ghost" id="findSeat">현재 좌석 찾기</button>
      </div>
    </div>
    
    <div id="currentSeatInfo" style="display:none;margin-bottom:16px;padding:12px;background:rgba(59, 130, 246, 0.1);border:1px solid rgba(59, 130, 246, 0.3);border-radius:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="color:#3b82f6;font-weight:600">📍 현재 좌석:</span>
        <span id="currentSeatNumber" style="background:#3b82f6;color:white;padding:4px 8px;border-radius:4px;font-weight:600"></span>
      </div>
    </div>
    
    <div id="moveSection" style="display:none">
      <div class="row" style="margin-bottom:16px">
        <div style="flex:0 0 120px">
          <label>이동할 좌석</label>
          <select id="newSeat">
            <option value="">좌석을 선택하세요</option>
          </select>
        </div>
        <div style="flex:0 0 auto;display:flex;align-items:end">
          <button class="primary" id="moveSeat">좌석 이동</button>
        </div>
      </div>
    </div>
    
    <p id="msg" class="muted" style="margin-top:10px"></p>
  `;
  document.querySelector('main').appendChild(card);

  const klassSel = $('#klass', card);
  const numSel = $('#number', card);
  const nameInput = $('#name', card);
  const findBtn = $('#findSeat', card);
  const currentSeatInfo = $('#currentSeatInfo', card);
  const currentSeatNumber = $('#currentSeatNumber', card);
  const moveSection = $('#moveSection', card);
  const newSeatSel = $('#newSeat', card);
  const moveBtn = $('#moveSeat', card);
  const msg = $('#msg', card);

  // 반 선택지 생성
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i}반`;
    klassSel.appendChild(opt);
  }

  // 좌석 선택지 생성 (1-100번)
  for (let i = 1; i <= 100; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i}번`;
    newSeatSel.appendChild(opt);
  }

  // 명단 자동 매칭
  let globalRoster = {};
  let globalMaxNumbers = {};
  
  loadRosterFromJSON().then(data => {
    globalRoster = data.roster;
    globalMaxNumbers = data.maxNumbers;
  });

  // 번호 선택지 업데이트 함수
  const updateNumberOptions = (selectedClass) => {
    numSel.innerHTML = '<option value="">번호를 선택하세요</option>';
    
    if (!selectedClass) return;
    
    const maxNum = globalMaxNumbers[selectedClass] || 25;
    for (let i = 1; i <= maxNum; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i}번`;
      numSel.appendChild(opt);
    }
  };

  // 이름 자동 채우기
  const updateName = () => {
    const k = Number(klassSel.value);
    const n = Number(numSel.value);
    
    if (k && n && globalRoster[k] && globalRoster[k][n]) {
      nameInput.value = globalRoster[k][n];
      nameInput.style.color = 'var(--text-primary)';
    } else {
      nameInput.value = '';
      nameInput.style.color = 'var(--text-secondary)';
    }
  };

  // 반 선택 변경 시
  klassSel.addEventListener('change', (e) => {
    const selectedClass = e.target.value ? Number(e.target.value) : null;
    updateNumberOptions(selectedClass);
    updateName();
    hideCurrentSeatInfo();
  });

  // 번호 선택 변경 시
  numSel.addEventListener('change', updateName);

  // 현재 좌석 찾기
  findBtn.addEventListener('click', async () => {
    const klass = Number(klassSel.value);
    const number = Number(numSel.value);
    
    if (!klass || !number) {
      msg.textContent = '반과 번호를 선택하세요.';
      msg.className = 'error';
      return;
    }

    try {
      const dateKey = todayKey();
      const snapshot = await getDocs(collection(db, 'checkins', dateKey, 'seats'));
      
      let currentSeat = null;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.class === klass && data.number === number) {
          currentSeat = doc.id;
        }
      });

      if (currentSeat) {
        currentSeatNumber.textContent = `${currentSeat}번`;
        currentSeatInfo.style.display = 'block';
        moveSection.style.display = 'block';
        
        // 현재 좌석을 새 좌석 선택에서 제외
        const currentSeatOption = newSeatSel.querySelector(`option[value="${currentSeat}"]`);
        if (currentSeatOption) {
          currentSeatOption.disabled = true;
          currentSeatOption.textContent = `${currentSeat}번 (현재 좌석)`;
        }
        
        msg.textContent = `현재 ${currentSeat}번 좌석에 앉아있습니다.`;
        msg.className = 'success';
      } else {
        hideCurrentSeatInfo();
        msg.textContent = '해당 학생의 출석 기록을 찾을 수 없습니다.';
        msg.className = 'error';
      }
    } catch (error) {
      console.error('좌석 조회 실패:', error);
      msg.textContent = `오류 발생: ${error.message}`;
      msg.className = 'error';
    }
  });

  // 좌석 이동
  moveBtn.addEventListener('click', async () => {
    const klass = Number(klassSel.value);
    const number = Number(numSel.value);
    const newSeat = newSeatSel.value;
    
    if (!klass || !number || !newSeat) {
      msg.textContent = '모든 정보를 입력하세요.';
      msg.className = 'error';
      return;
    }

    try {
      const dateKey = todayKey();
      
      // 현재 좌석에서 학생 정보 가져오기
      const currentSeat = currentSeatNumber.textContent.replace('번', '');
      const currentDoc = await getDoc(doc(db, 'checkins', dateKey, 'seats', currentSeat));
      
      if (!currentDoc.exists()) {
        msg.textContent = '현재 좌석 정보를 찾을 수 없습니다.';
        msg.className = 'error';
        return;
      }

      const studentData = currentDoc.data();
      
      // 새 좌석이 이미 사용 중인지 확인
      const newSeatDoc = await getDoc(doc(db, 'checkins', dateKey, 'seats', newSeat));
      if (newSeatDoc.exists()) {
        msg.textContent = `${newSeat}번 좌석은 이미 사용 중입니다.`;
        msg.className = 'error';
        return;
      }

      // 새 좌석에 학생 정보 저장
      await setDoc(doc(db, 'checkins', dateKey, 'seats', newSeat), studentData);
      
      // 기존 좌석에서 학생 정보 삭제
      await deleteDoc(doc(db, 'checkins', dateKey, 'seats', currentSeat));
      
      msg.textContent = `좌석 이동 완료! ${currentSeat}번 → ${newSeat}번`;
      msg.className = 'success';
      
      // UI 업데이트
      currentSeatNumber.textContent = `${newSeat}번`;
      
      // 새 좌석 선택 옵션 업데이트
      const oldCurrentOption = newSeatSel.querySelector(`option[value="${currentSeat}"]`);
      if (oldCurrentOption) {
        oldCurrentOption.disabled = false;
        oldCurrentOption.textContent = `${currentSeat}번`;
      }
      
      const newCurrentOption = newSeatSel.querySelector(`option[value="${newSeat}"]`);
      if (newCurrentOption) {
        newCurrentOption.disabled = true;
        newCurrentOption.textContent = `${newSeat}번 (현재 좌석)`;
      }
      
      newSeatSel.value = '';
      
    } catch (error) {
      console.error('좌석 이동 실패:', error);
      msg.textContent = `오류 발생: ${error.message}`;
      msg.className = 'error';
    }
  });

  // 현재 좌석 정보 숨기기
  function hideCurrentSeatInfo() {
    currentSeatInfo.style.display = 'none';
    moveSection.style.display = 'none';
    
    // 모든 좌석 옵션 활성화
    newSeatSel.querySelectorAll('option').forEach(opt => {
      opt.disabled = false;
      opt.textContent = opt.value ? `${opt.value}번` : '좌석을 선택하세요';
    });
    
    newSeatSel.value = '';
  }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const header = document.createElement('header');
  header.innerHTML = `<h1>좌석 이동 요청</h1>`;
  document.body.appendChild(header);
  
  const main = document.createElement('main');
  document.body.appendChild(main);
  
  renderSeatMove();
});
