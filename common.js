// 공통 유틸리티 함수들

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const fmtClassNo = (klass, num) => `${klass}반 ${num}번`;

// JSON 파일에서 명단 로드
export async function loadRosterFromJSON() {
  try {
    const response = await fetch('name_list.json');
    const jsonData = await response.json();
    
    const roster = {};
    const maxNumbers = {}; // 각 반의 최대 번호 저장
    
    jsonData.forEach(student => {
      const klass = student.반;
      const number = student.번호;
      const name = student.이름;
      
      if (klass >= 1 && klass <= 10 && number >= 1) {
        if (!roster[klass]) roster[klass] = {};
        roster[klass][number] = name;
        
        // 각 반의 최대 번호 업데이트
        if (!maxNumbers[klass] || number > maxNumbers[klass]) {
          maxNumbers[klass] = number;
        }
      }
    });
    
    return { roster, maxNumbers };
  } catch (error) {
    console.error('JSON 파일 로드 실패:', error);
    return { roster: {}, maxNumbers: {} };
  }
}

// Firebase 설정
export const firebaseConfig = {
  apiKey: "AIzaSyBSfmmAYJAi3vXg3ZclB0PiBaNyV2lJ24s",
  authDomain: "self-check-3d44e.firebaseapp.com",
  projectId: "self-check-3d44e",
  storageBucket: "self-check-3d44e.firebasestorage.app",
  messagingSenderId: "1013380899103",
  appId: "1:1013380899103:web:3f3125f116446835c3d02a"
};

// Firebase 앱 초기화 (중복 방지) - 각 파일에서 직접 import해서 사용
