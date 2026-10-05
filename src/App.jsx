import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api/quizzes';

// 백엔드 서버가 안 켜져 있을 때 사용할 기본 초기 데이터
const DEFAULT_QUIZZES = [
  { id: 1, problem: '오늘도열심히공부했다.', answer: '오늘도 열심히 공부했다.' },
  { id: 2, problem: '아버지가방에들어가신다.', answer: '아버지가 방에 들어가신다.' },
  { id: 3, problem: '한국어는어렵지만재밌다.', answer: '한국어는 어렵지만 재밌다.' },
  { id: 4, problem: '밥은먹고다니냐.', answer: '밥은 먹고 다니냐.' },
  { id: 5, problem: '그때그사람이보고싶다.', answer: '그때 그 사람이 보고 싶다.' },
];

export default function App() {
  // 'start' | 'playing' | 'result' | 'ending' | 'admin'
  const [gameState, setGameState] = useState('start'); 
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  
  // 전체 퀴즈 목록
  const [allQuizzes, setAllQuizzes] = useState(DEFAULT_QUIZZES);
  // 안 푼 문제 보관용
  const [unseenQuestions, setUnseenQuestions] = useState(DEFAULT_QUIZZES);
  const [isPoolReset, setIsPoolReset] = useState(false);

  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect'
  const [timer, setTimer] = useState(5);

  // ⚙️ 관리자 폼 상태
  const [formProblem, setFormProblem] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [editingId, setEditingId] = useState(null);

  const inputRef = useRef(null);

  // 1. 로고 클릭 시 홈(시작 화면)으로 이동
  const handleGoHome = () => {
    setGameState('start');
    setUserInput('');
    setFeedback(null);
    setEditingId(null);
    setFormProblem('');
    setFormAnswer('');
  };

  // 2. 백엔드 서버에서 퀴즈 데이터 가져오기 (Read)
  const fetchQuizzes = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('서버 응답 오류');
      const data = await res.json();
      if (data && data.length > 0) {
        setAllQuizzes(data);
        setUnseenQuestions(data);
      }
    } catch (err) {
      console.warn('백엔드 서버 미연결 (로컬 기본 데이터 사용 중):', err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // 게임 시작
  const handleStartGame = () => {
    if (allQuizzes.length === 0) {
      alert('등록된 문제가 없습니다! 먼저 [⚙️ 문제 관리자] 메뉴에서 문제를 추가해 주세요.');
      return;
    }

    let pool = [...unseenQuestions];
    let resetNotice = false;

    if (pool.length === 0) {
      pool = [...allQuizzes];
      resetNotice = true;
    }

    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const ROUND_SIZE = Math.min(5, shuffledPool.length); 
    const currentRoundQuestions = shuffledPool.slice(0, ROUND_SIZE);
    const remainingPool = shuffledPool.slice(ROUND_SIZE);

    setUnseenQuestions(remainingPool);
    setShuffledQuestions(currentRoundQuestions);
    setIsPoolReset(resetNotice);

    setGameState('playing');
    setScore(0);
    setCurrentQuestionIndex(0);
    setUserInput('');
    setFeedback(null);
  };

  // 띄어쓰기 정제 함수
  const normalizeText = (text) => {
    if (!text) return '';
    let cleaned = text.trim().replace(/\s+/g, ' ');
    if (cleaned.endsWith('.')) {
      cleaned = cleaned.slice(0, -1).trim();
    }
    return cleaned;
  };

  // 다음 문제 이동
  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < shuffledQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserInput('');
      setFeedback(null);
      setGameState('playing');
    } else {
      setGameState('ending');
    }
  };

  // 제출 처리
  const handleSubmit = (e) => {
    e.preventDefault();

    if (gameState === 'result') {
      handleNextQuestion();
      return;
    }

    if (!userInput.trim()) return;

    const currentProblem = shuffledQuestions[currentQuestionIndex];
    const problemAnswer = currentProblem.answer;

    const normalizedUserAnswer = normalizeText(userInput);
    const normalizedCorrectAnswer = normalizeText(problemAnswer);

    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      setFeedback('correct');
      setScore((prev) => prev + 1);
    } else {
      setFeedback('incorrect');
    }

    setGameState('result');
    setTimer(5);
  };

  // ================= ⚙️ CRUD 관리자 핸들러 =================

  const handleAdminFormSubmit = async (e) => {
    e.preventDefault();
    if (!formProblem.trim() || !formAnswer.trim()) {
      alert('문제와 정답을 모두 입력해주세요.');
      return;
    }

    const quizData = {
      question: formProblem.trim(),
      problem: formProblem.trim(),
      answer: formAnswer.trim()
    };

    try {
      if (editingId) {
        // [Update] 수정
        const res = await fetch(`${API_URL}/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quizData)
        });
        if (!res.ok) throw new Error('수정 실패');
      } else {
        // [Create] 추가
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quizData)
        });
        if (!res.ok) throw new Error('추가 실패');
      }

      await fetchQuizzes();
      alert(editingId ? '문제가 수정되었습니다!' : '새 문제가 성공적으로 추가되었습니다!');
    } catch (err) {
      console.error('서버 저장 실패 -> 로컬 데이터 직접 업데이트:', err);
      
      if (editingId) {
        const updated = allQuizzes.map(q => q.id === editingId ? { ...q, ...quizData } : q);
        setAllQuizzes(updated);
        setUnseenQuestions(updated);
      } else {
        const newQuiz = { id: Date.now(), ...quizData };
        const updated = [...allQuizzes, newQuiz];
        setAllQuizzes(updated);
        setUnseenQuestions(updated);
      }
      alert(editingId ? '문제가 수정되었습니다.' : '새 문제가 추가되었습니다.');
    }

    setFormProblem('');
    setFormAnswer('');
    setEditingId(null);
  };

  // 수정 모드 진입
  const handleEditClick = (quiz) => {
    setEditingId(quiz.id);
    setFormProblem(quiz.question || quiz.problem || '');
    setFormAnswer(quiz.answer || '');
  };

  // [Delete] 삭제
  const handleDeleteClick = async (id) => {
    if (!window.confirm('정말 이 문제를 삭제하시겠습니까?')) return;

    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await fetchQuizzes();
    } catch (err) {
      const updated = allQuizzes.filter(q => q.id !== id);
      setAllQuizzes(updated);
      setUnseenQuestions(updated);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormProblem('');
    setFormAnswer('');
  };

  // Effect Hooks
  useEffect(() => {
    if (gameState !== 'result') return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleNextQuestion();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, currentQuestionIndex, shuffledQuestions]);

  useEffect(() => {
    if (gameState === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [gameState, currentQuestionIndex]);

  const currentProblem = shuffledQuestions[currentQuestionIndex];
  const problemQuestionText = currentProblem?.question || currentProblem?.problem;

  return (
    <div className="App">
      <div className="main-content">
        {/* 상단 픽셀 로고 */}
        <div className="pixel-logo-container">
          <img 
            src="./logo.svg" 
            alt="로고" 
            className="logo-img" 
            onClick={handleGoHome}
            style={{ cursor: 'pointer' }}
            title="첫 화면으로 돌아가기"
          />
        </div>

        {/* 메인 퀴즈 카드 박스 (overflow: hidden으로 내용물이 밖으로 나가는 것을 방지) */}
        <div className="quiz-card" style={{ overflow: 'hidden', minWidth: '340px' }}>
          {/* 1. 시작 화면 */}
          {gameState === 'start' && (
            <div className="card-content-start" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <h2 className="title-text" style={{ textAlign: 'center' }}>띄어쓰기 퀴즈</h2>
              <p className="subtitle-text" style={{ textAlign: 'center' }}>당신의 띄어쓰기 능력을 확인해보세요 ✏️</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
                <button 
                  className="pixel-button" 
                  style={{ 
                    width: '200px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    textAlign: 'center'
                  }} 
                  onClick={handleStartGame}
                >
                  start!
                </button>
                {/* 💡 홈 화면의 '⚙️ 문제 관리자' 버튼 중앙 정렬 스타일 적용 */}
                <button 
                  className="pixel-button" 
                  style={{ 
                    backgroundColor: '#5c5c8a', 
                    fontSize: '14px', 
                    whiteSpace: 'nowrap', 
                    width: '200px',
                    padding: '10px 0',
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    textAlign: 'center'
                  }} 
                  onClick={() => setGameState('admin')}
                >
                  ⚙️ 문제 관리자
                </button>
              </div>
            </div>
          )}

          {/* 2. 문제 입력 화면 */}
          {gameState === 'playing' && (
            <div className="card-content-playing">
              <div className="card-header">
                <span className="question-counter">Q. {currentQuestionIndex + 1}</span>
                <span className="score-display">score: {score}</span>
              </div>

              <div className="problem-text-container">
                <p className="problem-text">{problemQuestionText}</p>
              </div>

              <form onSubmit={handleSubmit} className="input-area">
                <input
                  ref={inputRef}
                  type="text"
                  className="pixel-input"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="pixel-button">
                  제출
                </button>
              </form>
            </div>
          )}

          {/* 3. 문제별 정답 / 오답 피드백 화면 */}
          {gameState === 'result' && (
            <div className="card-content-playing">
              <div className="card-header">
                <span className="question-counter">Q. {currentQuestionIndex + 1}</span>
                <span className="score-display">score: {score}</span>
              </div>

              <div className="feedback-overlay">
                <p className={`feedback-text ${feedback}`}>
                  {feedback === 'correct' ? '정답입니다 ! 🎉' : '오답입니다 ! 😭'}
                </p>

                <input
                  type="text"
                  className={`pixel-input ${feedback}`}
                  value={userInput}
                  readOnly
                />

                {feedback === 'incorrect' && (
                  <p className="correct-answer-guide">
                    정답: <span>{currentProblem?.answer}</span>
                  </p>
                )}

                <div className="button-group">
                  <button className="pixel-button" onClick={handleNextQuestion}>
                    다음 문제
                  </button>
                </div>
                <p className="timer-text">{timer}초 후 다음 문제로 이동 (Space)</p>
              </div>
            </div>
          )}

          {/* 4. 최종 점수 / 퀴즈 종료 화면 */}
          {gameState === 'ending' && (
            <div className="card-content-start">
              <h2 className="title-text">🎉 퀴즈 종료!</h2>
              <p className="subtitle-text">
                총 <strong>{shuffledQuestions.length}</strong>문제 중 <strong>{score}</strong>문제를 맞혔습니다!
              </p>
              
              {isPoolReset && (
                <p className="reset-notice-text">
                  💡 모든 문제를 풀어 문제 은행이 다시 리셋되었습니다!
                </p>
              )}

              <p className="remaining-count-text">
                (남은 미풀이 문제: {unseenQuestions.length}개)
              </p>

              <button className="pixel-button large" onClick={handleStartGame}>
                다시 도전
              </button>
            </div>
          )}

          {/* 5. ⚙️ 문제 관리자 (CRUD) 화면 - 높이 210px 제한으로 '문제 추가' 버튼까지만 처음 노출 */}
          {gameState === 'admin' && (
            <div style={{ 
              height: '210px', 
              overflowY: 'auto', 
              width: '100%', 
              boxSizing: 'border-box',
              paddingRight: '4px' 
            }}>
              <h2 className="title-text" style={{ textAlign: 'center', marginBottom: '12px', fontSize: '18px' }}>
                ⚙️ 문제 관리자
              </h2>

              {/* 1) 입력 폼 & 추가 버튼 (기본 화면에 딱 보이도록 배치) */}
              <form onSubmit={handleAdminFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  className="pixel-input"
                  placeholder="붙여쓴 문제 (예: 오늘날씨가좋다.)"
                  value={formProblem}
                  onChange={(e) => setFormProblem(e.target.value)}
                  style={{ fontSize: '12px', padding: '8px 10px', width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  className="pixel-input"
                  placeholder="올바른 정답 (예: 오늘 날씨가 좋다.)"
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  style={{ fontSize: '12px', padding: '8px 10px', width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="submit" className="pixel-button" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {editingId ? '수정 완료' : '문제 추가'}
                  </button>
                  {editingId && (
                    <button type="button" className="pixel-button" style={{ backgroundColor: '#888', padding: '8px', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={handleCancelEdit}>
                      취소
                    </button>
                  )}
                </div>
              </form>

              {/* 2) 등록된 문제 목록 (스크롤을 직접 내렸을 때만 나타남) */}
              <div style={{ borderTop: '1px dashed #ccc', paddingTop: '12px', marginBottom: '16px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>
                  📋 등록된 문제 목록 ({allQuizzes.length}개)
                </p>
                {allQuizzes.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>등록된 문제가 없습니다.</p>
                ) : (
                  allQuizzes.map((q) => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                        <div><strong>Q:</strong> {q.question || q.problem}</div>
                        <div style={{ color: '#666' }}><strong>A:</strong> {q.answer}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleEditClick(q)} style={{ padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => handleDeleteClick(q.id)} style={{ padding: '2px 6px', fontSize: '10px', cursor: 'pointer', backgroundColor: '#e64a19', color: '#fff', border: 'none', borderRadius: '3px' }}>삭제</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 3) 돌아가기 버튼 (스크롤 가장 하단) */}
              <button className="pixel-button" style={{ width: '100%', fontSize: '12px', padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setGameState('start')}>
                🎮 메인으로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}