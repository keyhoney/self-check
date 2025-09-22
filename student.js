// 학생 페이지 전용 JavaScript

import { $, $$, todayKey, fmtClassNo, loadRosterFromJSON, firebaseConfig } from './common.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// URL 파라미터에서 좌석 번호 가져오기
const params = new URLSearchParams(location.search);
const seatId = params.get('seat');

// ===== 학생용 =====
async function renderStudent() {
  // 출석 체크 카드
  const attendanceCard = document.createElement('div');
  attendanceCard.className = 'card';
  const seatInfo = seatId ? `
    <div style="display:flex;align-items:center;gap:12px">
      <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:8px 16px;border-radius:20px;color:white;font-weight:600;font-size:16px;box-shadow:0 4px 15px rgba(102, 126, 234, 0.3)">
        🪑 ${seatId}번 좌석
      </div>
    </div>
  ` : '<strong class="error">좌석 정보가 없습니다</strong>';
  attendanceCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      ${seatInfo}
    </div>
    <div class="row">
      <div style="flex:0 0 180px">
        <label>반 (1~10)</label>
        <select id="klass"></select>
      </div>
      <div style="flex:0 0 180px">
        <label>번호</label>
        <select id="number"></select>
      </div>
      <div style="flex:0 0 220px">
        <label>이름</label>
        <input id="name" type="text" placeholder="반과 번호를 선택하세요요" />
      </div>
      <div style="flex:0 0 auto;display:flex;align-items:end">
        <button class="primary" id="submitBtn">출석 체크</button>
      </div>
    </div>
    <p id="msg" class="muted" style="margin-top:10px"></p>
  `;
  document.querySelector('main').appendChild(attendanceCard);

  // 좌석 이동 카드
  const moveCard = document.createElement('div');
  moveCard.className = 'card';
  moveCard.innerHTML = `

    <p style="margin: 0 0 12px 0; color: var(--text-secondary); font-size: 14px;">
      QR Code로 셀프 체크한 뒤 좌석을 이동하셨나요?   
        <button 
      class="ghost" 
      style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;"
      onclick="window.open('seat-move.html', '_blank')"
    >
      🔄 좌석 이동 요청
    </button>
    </p>
  `;
  document.querySelector('main').appendChild(moveCard);

  const klassSel = $('#klass', attendanceCard);
  const numSel = $('#number', attendanceCard);

  // 플레이스홀더 옵션 추가
  const placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.textContent = '반을 선택하세요';
  placeholderOpt.disabled = true;
  placeholderOpt.selected = true;
  klassSel.appendChild(placeholderOpt);
  
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i}반`;
    klassSel.appendChild(opt);
  }

  // 명단 자동 매칭 (JSON 파일에서 로드)
  let globalRoster = {};
  let globalMaxNumbers = {};
  
  // 번호 선택지 업데이트 함수
  const updateNumberOptions = (selectedClass) => {
    // 기존 번호 옵션 제거
    numSel.innerHTML = '';
    
    // 플레이스홀더 옵션 추가
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = '번호를 선택하세요';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    numSel.appendChild(placeholderOpt);
    
    // 반이 선택되지 않은 경우 번호 옵션을 추가하지 않음
    if (!selectedClass) return;
    
    const maxNum = globalMaxNumbers[selectedClass] || 25;
    for (let i = 1; i <= maxNum; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i}번`;
      numSel.appendChild(opt);
    }
  };
  
  loadRosterFromJSON().then(data => {
    globalRoster = data.roster;
    globalMaxNumbers = data.maxNumbers;
    
    // 초기 번호 옵션 설정 (플레이스홀더만 표시)
    updateNumberOptions(null);
    
    const tryFill = () => {
      const k = Number(klassSel.value);
      const n = Number(numSel.value);
      const nameInput = $('#name', attendanceCard);
      
      // 사용자가 수동으로 입력한 경우를 확인
      const isManualInput = nameInput.dataset.manual === 'true';
      
      if (k && n && globalRoster[k] && globalRoster[k][n]) {
        // 명단에 있는 경우 자동으로 채우기 (수동 입력이 아닌 경우에만)
        if (!isManualInput) {
          nameInput.value = globalRoster[k][n];
          nameInput.style.color = 'var(--text-primary)';
          nameInput.placeholder = '명단에서 자동 매칭됨 (수정 가능)';
          nameInput.title = '자동으로 불러온 이름입니다. 필요시 수정할 수 있습니다.';
        } else {
          nameInput.style.color = 'var(--text-primary)';
          nameInput.placeholder = '수동으로 입력된 이름';
          nameInput.title = '수동으로 입력된 이름입니다.';
        }
      } else if (k && n) {
        // 반과 번호는 선택했지만 명단에 없는 경우
        if (!isManualInput) {
          nameInput.value = '';
        }
        nameInput.style.color = 'var(--text-secondary)';
        nameInput.placeholder = '명단에 없습니다. 직접 입력하세요';
        nameInput.title = '선택한 반과 번호가 명단에 없습니다. 이름을 직접 입력해주세요.';
      } else {
        // 반이나 번호가 선택되지 않은 경우
        if (!isManualInput) {
          nameInput.value = '';
        }
        nameInput.style.color = 'var(--text-secondary)';
        nameInput.placeholder = '반과 번호를 선택하세요';
        nameInput.title = '반과 번호를 선택하면 명단에서 자동으로 이름을 불러옵니다.';
      }
    };

    // 이름 입력 필드에 수동 입력 감지 이벤트 추가
    const nameInput = $('#name', attendanceCard);
    nameInput.addEventListener('input', () => {
      nameInput.dataset.manual = 'true';
      nameInput.style.color = 'var(--text-primary)';
      nameInput.placeholder = '수동으로 입력된 이름';
      nameInput.title = '수동으로 입력된 이름입니다.';
    });
    
    // 반이나 번호가 변경되면 수동 입력 플래그 리셋
    const resetManualFlag = () => {
      nameInput.dataset.manual = 'false';
    };
    
    // 반 선택 변경 시 번호 옵션 업데이트
    klassSel.addEventListener('change', (e) => {
      const selectedClass = e.target.value ? Number(e.target.value) : null;
      updateNumberOptions(selectedClass);
      resetManualFlag();
      tryFill();
    });
    
    numSel.addEventListener('change', resetManualFlag);
    
    // 이벤트 리스너 등록
    numSel.addEventListener('change', tryFill);
    
    // 초기 실행
    tryFill();
  });

  $('#submitBtn', attendanceCard).addEventListener('click', async () => {
    const klass = Number(klassSel.value);
    const number = Number(numSel.value);
    const name = $('#name', attendanceCard).value.trim();
    const seat = seatId;
    const msg = $('#msg', attendanceCard);
    
    if (!seat) {
      msg.textContent = '좌석 정보가 없습니다.';
      msg.className = 'error';
      return;
    }
    if (!klass || !number) {
      msg.textContent = '반/번호를 선택하세요.';
      msg.className = 'error';
      return;
    }
    
    try {
      const dateKey = todayKey();
      
      // 해당 좌석이 이미 사용 중인지 확인
      const seatDoc = await getDoc(doc(db, 'checkins', dateKey, 'seats', String(seat)));
      if (seatDoc.exists()) {
        const existingData = seatDoc.data();
        msg.textContent = `${seat}번 좌석은 이미 사용 중입니다.`;
        msg.className = 'error';
        return;
      }
      
      const payload = { class: klass, number, name: name || null, ts: Date.now() };
      
      // 계층 구조: checkins/날짜/seats/좌석번호
      await setDoc(doc(db, 'checkins', dateKey, 'seats', String(seat)), payload);
      msg.textContent = `체크 완료! (${fmtClassNo(klass, number)} ${name || ''})`;
      msg.className = 'success';
    } catch (error) {
      console.error('출석 체크 실패:', error);
      msg.textContent = `오류 발생: ${error.message}`;
      msg.className = 'error';
    }
  });

}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  const header = document.createElement('header');
  header.innerHTML = `<h1>자율학습 QR 출석체크 (학생용)</h1>`;
  document.body.appendChild(header);
  
  const main = document.createElement('main');
  document.body.appendChild(main);
  
  renderStudent();
});





