import React, { useState, useEffect, useMemo } from 'react';

// ==========================================
// TYPES & INTERFACES (JS / React implementation)
// ==========================================

const STORAGE_VERSION = 'v1';
const SENTENCES_KEY = `sentenceflow_${STORAGE_VERSION}_sentences`;
const RECORDS_KEY = `sentenceflow_${STORAGE_VERSION}_records`;
const SESSIONS_KEY = `sentenceflow_${STORAGE_VERSION}_sessions`;

const SAMPLE_SENTENCES = [
  {
    englishText: "I want to learn English.",
    koreanMeaning: "나는 영어를 배우고 싶다.",
    category: "기초",
    difficulty: "Easy",
    memo: "가장 기본적인 소망 표현 (want to + 동사원형)",
    isFavorite: true,
  },
  {
    englishText: "I usually wake up early.",
    koreanMeaning: "나는 보통 일찍 일어난다.",
    category: "일상",
    difficulty: "Easy",
    memo: "습관을 나타내는 빈도부사 usually",
    isFavorite: false,
  },
  {
    englishText: "Could you help me with this?",
    koreanMeaning: "이것 좀 도와주실 수 있나요?",
    category: "비즈니스/여행",
    difficulty: "Medium",
    memo: "공손한 요청 표현 (Could you...)",
    isFavorite: true,
  },
  {
    englishText: "I have been studying English for two years.",
    koreanMeaning: "나는 2년 동안 영어를 공부해 왔다.",
    category: "학습",
    difficulty: "Hard",
    memo: "현재완료진행형 (have been + -ing)",
    isFavorite: false,
  },
  {
    englishText: "If I have time, I will call you.",
    koreanMeaning: "시간이 있으면 너에게 전화할게.",
    category: "조건",
    difficulty: "Medium",
    memo: "조건문: 조건절에서는 현재시제가 미래를 대신함",
    isFavorite: true,
  }
];

// ==========================================
// UTILS & ANSWER NORMALIZATION
// ==========================================
function normalizeString(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, ' ');
}

function tokenizeSentence(text) {
  const rawWords = text.trim().split(/\s+/);
  return rawWords.map((word, index) => ({
    id: `${index}-${word}-${Math.random().toString(36).substring(2, 6)}`,
    text: word
  }));
}

function compareDirectAnswers(userAns, correctAns) {
  const normUser = normalizeString(userAns);
  const normCorrect = normalizeString(correctAns);
  return normUser === normCorrect;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function App() {
  // Navigation & UI States
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeModal, setActiveModal] = useState(null); // 'delete' | 'reset' | null
  const [modalData, setModalData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Core Data States
  const [sentences, setSentences] = useState([]);
  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Editing / Form State
  const [editingSentenceId, setEditingSentenceId] = useState(null);

  // Study Setup State
  const [studyConfig, setStudyConfig] = useState({
    mode: 'word-arrange', // 'word-arrange' | 'typing' | 'mixed'
    scope: 'all', // 'all' | 'favorites' | 'unstudied' | 'incorrect' | 'category'
    categoryFilter: '',
    questionCount: 10,
    order: 'random' // 'random' | 'sequential' | 'incorrect-first'
  });

  // Active Study Session State
  const [activeSessionQueue, setActiveSessionQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(0);
  const [currentQuestionAttempts, setCurrentQuestionAttempts] = useState(0);
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState(0);
  
  // Word Arrange specific state
  const [poolWords, setPoolWords] = useState([]);
  const [assembledWords, setAssembledWords] = useState([]);
  const [wordCheckResult, setWordCheckResult] = useState('idle'); // 'idle' | 'correct' | 'incorrect'

  // Typing specific state
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingCheckResult, setTypingCheckResult] = useState('idle'); // 'idle' | 'correct' | 'incorrect'
  const [showAnswerInTyping, setShowAnswerInTyping] = useState(false);

  // Session Results State
  const [lastCompletedSession, setLastCompletedSession] = useState(null);

  // Filter & Search state for Sentence List
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, favorite, studied, unstudied
  const [sortBy, setSortBy] = useState('latest');

  // ==========================================
  // LOCALSTORAGE INITIALIZATION
  // ==========================================
  useEffect(() => {
    try {
      const savedSentences = localStorage.getItem(SENTENCES_KEY);
      const savedRecords = localStorage.getItem(RECORDS_KEY);
      const savedSessions = localStorage.getItem(SESSIONS_KEY);

      if (savedSentences) {
        setSentences(JSON.parse(savedSentences));
      } else {
        const initial = SAMPLE_SENTENCES.map((s, idx) => ({
          ...s,
          id: `sample-${idx + 1}-${Date.now()}`,
          createdAt: Date.now() - idx * 100000,
          updatedAt: Date.now() - idx * 100000,
          studyCount: 0,
          correctCount: 0
        }));
        setSentences(initial);
        localStorage.setItem(SENTENCES_KEY, JSON.stringify(initial));
      }

      if (savedRecords) setRecords(JSON.parse(savedRecords));
      if (savedSessions) setSessions(JSON.parse(savedSessions));
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      showToast("로컬 데이터 로드 중 오류가 발생했습니다.");
    }
  }, []);

  // Sync data to localStorage
  useEffect(() => {
    if (sentences.length > 0) {
      localStorage.setItem(SENTENCES_KEY, JSON.stringify(sentences));
    }
  }, [sentences]);

  useEffect(() => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // ==========================================
  // SENTENCE CRUD OPERATIONS
  // ==========================================
  const handleSaveSentence = (data) => {
    if (!data.englishText.trim()) {
      showToast("영어 문장을 입력해주세요.");
      return;
    }

    if (editingSentenceId) {
      // Edit existing sentence
      setSentences(prev => prev.map(s => s.id === editingSentenceId ? {
        ...s,
        ...data,
        updatedAt: Date.now()
      } : s));
      showToast("문장이 성공적으로 수정되었습니다.");
      setEditingSentenceId(null);
    } else {
      // Create new sentence
      const newSentence = {
        id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        studyCount: 0,
        correctCount: 0
      };
      setSentences(prev => [newSentence, ...prev]);
      showToast("새로운 문장이 등록되었습니다!");
    }
    setCurrentView('list');
  };

  const handleDeleteSentence = (id) => {
    setSentences(prev => prev.filter(s => s.id !== id));
    showToast("문장이 삭제되었습니다.");
    setActiveModal(null);
  };

  const handleToggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    setSentences(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  // ==========================================
  // STUDY SESSION LOGIC
  // ==========================================
  const startStudySession = () => {
    let targetPool = [...sentences];

    if (targetPool.length === 0) {
      showToast("등록된 문장이 없습니다. 먼저 문장을 추가해주세요.");
      return;
    }

    // Filter by scope
    if (studyConfig.scope === 'favorites') {
      targetPool = targetPool.filter(s => s.isFavorite);
    } else if (studyConfig.scope === 'unstudied') {
      targetPool = targetPool.filter(s => s.studyCount === 0);
    } else if (studyConfig.scope === 'incorrect') {
      const incorrectIds = new Set(records.filter(r => !r.isCorrect).map(r => r.sentenceId));
      targetPool = targetPool.filter(s => incorrectIds.has(s.id));
    } else if (studyConfig.scope === 'category' && studyConfig.categoryFilter) {
      targetPool = targetPool.filter(s => s.category === studyConfig.categoryFilter);
    }

    if (targetPool.length === 0) {
      showToast("조건에 해당하는 문장이 없습니다. 다른 설정을 선택해주세요.");
      return;
    }

    // Order
    if (studyConfig.order === 'random') {
      targetPool.sort(() => Math.random() - 0.5);
    } else if (studyConfig.order === 'incorrect-first') {
      const incorrectIds = new Set(records.filter(r => !r.isCorrect).map(r => r.sentenceId));
      targetPool.sort((a, b) => {
        const aInc = incorrectIds.has(a.id) ? 0 : 1;
        const bInc = incorrectIds.has(b.id) ? 0 : 1;
        return aInc - bInc;
      });
    }

    // Limit question count
    if (studyConfig.questionCount > 0 && studyConfig.questionCount < targetPool.length) {
      targetPool = targetPool.slice(0, studyConfig.questionCount);
    }

    setActiveSessionQueue(targetPool);
    setCurrentIndex(0);
    setSessionStartTime(Date.now());
    
    // Initialize first question
    initQuestion(targetPool[0], studyConfig.mode);
    setCurrentView('study');
  };

  const initQuestion = (sentence, mode) => {
    setCurrentQuestionAttempts(0);
    setCurrentQuestionStartTime(Date.now());
    setWordCheckResult('idle');
    setTypingCheckResult('idle');
    setTypedAnswer('');
    setShowAnswerInTyping(false);

    const actualMode = mode === 'mixed' 
      ? (Math.random() > 0.5 ? 'word-arrange' : 'typing') 
      : mode;

    if (actualMode === 'word-arrange') {
      const tokens = tokenizeSentence(sentence.englishText);
      const shuffled = [...tokens].sort(() => Math.random() - 0.5);
      setPoolWords(shuffled);
      setAssembledWords([]);
    }
  };

  // Word Arrange Mode Handlers
  const handleSelectPoolWord = (token) => {
    setPoolWords(prev => prev.filter(w => w.id !== token.id));
    setAssembledWords(prev => [...prev, token]);
  };

  const handleReturnAssembledWord = (token) => {
    setAssembledWords(prev => prev.filter(w => w.id !== token.id));
    setPoolWords(prev => [...prev, token]);
  };

  const handleResetWordArrange = () => {
    const currentSentence = activeSessionQueue[currentIndex];
    if (!currentSentence) return;
    const tokens = tokenizeSentence(currentSentence.englishText);
    setPoolWords([...tokens].sort(() => Math.random() - 0.5));
    setAssembledWords([]);
    setWordCheckResult('idle');
  };

  const handleCheckWordArrange = () => {
    const currentSentence = activeSessionQueue[currentIndex];
    const correctTokens = tokenizeSentence(currentSentence.englishText);

    if (assembledWords.length !== correctTokens.length) {
      showToast("모든 단어를 배열해 주세요.");
      return;
    }

    const userString = assembledWords.map(w => w.text).join(' ');
    const isCorrect = normalizeString(userString) === normalizeString(currentSentence.englishText);

    const attempts = currentQuestionAttempts + 1;
    setCurrentQuestionAttempts(attempts);
    setWordCheckResult(isCorrect ? 'correct' : 'incorrect');

    // Save Study Record
    const duration = Math.round((Date.now() - currentQuestionStartTime) / 1000);
    const newRecord = {
      id: `rec-${Date.now()}`,
      sentenceId: currentSentence.id,
      mode: 'word-arrange',
      userAnswer: userString,
      isCorrect,
      attemptCount: attempts,
      studiedAt: Date.now(),
      duration
    };
    setRecords(prev => [newRecord, ...prev]);

    // Update Sentence Level Stats
    setSentences(prev => prev.map(s => {
      if (s.id === currentSentence.id) {
        return {
          ...s,
          studyCount: s.studyCount + 1,
          correctCount: isCorrect ? s.correctCount + 1 : s.correctCount,
          lastStudiedAt: Date.now()
        };
      }
      return s;
    }));
  };

  // Direct Typing Mode Handlers
  const handleCheckTyping = () => {
    const currentSentence = activeSessionQueue[currentIndex];
    const isCorrect = compareDirectAnswers(typedAnswer, currentSentence.englishText);

    const attempts = currentQuestionAttempts + 1;
    setCurrentQuestionAttempts(attempts);
    setTypingCheckResult(isCorrect ? 'correct' : 'incorrect');

    const duration = Math.round((Date.now() - currentQuestionStartTime) / 1000);
    const newRecord = {
      id: `rec-${Date.now()}`,
      sentenceId: currentSentence.id,
      mode: 'typing',
      userAnswer: typedAnswer,
      isCorrect,
      attemptCount: attempts,
      studiedAt: Date.now(),
      duration
    };
    setRecords(prev => [newRecord, ...prev]);

    setSentences(prev => prev.map(s => {
      if (s.id === currentSentence.id) {
        return {
          ...s,
          studyCount: s.studyCount + 1,
          correctCount: isCorrect ? s.correctCount + 1 : s.correctCount,
          lastStudiedAt: Date.now()
        };
      }
      return s;
    }));
  };

  const handleNextQuestion = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < activeSessionQueue.length) {
      setCurrentIndex(nextIdx);
      initQuestion(activeSessionQueue[nextIdx], studyConfig.mode);
    } else {
      finishSession();
    }
  };

  const finishSession = () => {
    const sessionRecords = records.filter(r => r.studiedAt >= sessionStartTime);
    let correctCount = 0;
    let incorrectCount = 0;
    let firstTryCorrect = 0;
    const incorrectIds = new Set();

    activeSessionQueue.forEach(s => {
      const sRecords = sessionRecords.filter(r => r.sentenceId === s.id);
      if (sRecords.length > 0) {
        const first = sRecords[sRecords.length - 1]; // oldest in this session
        const last = sRecords[0]; // latest
        if (last.isCorrect) {
          correctCount++;
          if (first.isCorrect && first.attemptCount === 1) {
            firstTryCorrect++;
          }
        } else {
          incorrectCount++;
          incorrectIds.add(s.id);
        }
      } else {
        incorrectCount++;
        incorrectIds.add(s.id);
      }
    });

    const session = {
      id: `ses-${Date.now()}`,
      mode: studyConfig.mode,
      totalQuestions: activeSessionQueue.length,
      correctCount,
      incorrectCount,
      firstTryCorrectCount: firstTryCorrect,
      startedAt: sessionStartTime,
      completedAt: Date.now(),
      incorrectSentenceIds: Array.from(incorrectIds)
    };

    setSessions(prev => [session, ...prev]);
    setLastCompletedSession(session);
    setCurrentView('result');
  };

  // ==========================================
  // FILTERED SENTENCES & CATEGORIES
  // ==========================================
  const filteredSentences = useMemo(() => {
    return sentences.filter(s => {
      const matchQuery = s.englishText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.koreanMeaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.memo && s.memo.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = filterCategory === 'all' || s.category === filterCategory;
      const matchDiff = filterDifficulty === 'all' || s.difficulty === filterDifficulty;
      
      let matchStatus = true;
      if (filterStatus === 'favorite') matchStatus = s.isFavorite;
      else if (filterStatus === 'studied') matchStatus = s.studyCount > 0;
      else if (filterStatus === 'unstudied') matchStatus = s.studyCount === 0;

      return matchQuery && matchCat && matchDiff && matchStatus;
    }).sort((a, b) => {
      if (sortBy === 'latest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'alphabetical') return a.englishText.localeCompare(b.englishText);
      return 0;
    });
  }, [sentences, searchQuery, filterCategory, filterDifficulty, filterStatus, sortBy]);

  const categories = useMemo(() => {
    const set = new Set(sentences.map(s => s.category).filter(Boolean));
    return Array.from(set);
  }, [sentences]);

  // Statistics Summaries
  const statsSummary = useMemo(() => {
    const totalSentences = sentences.length;
    const totalStudyCount = sentences.reduce((acc, s) => acc + s.studyCount, 0);
    const totalCorrect = sentences.reduce((acc, s) => acc + s.correctCount, 0);
    const overallAccuracy = totalStudyCount > 0 ? Math.round((totalCorrect / totalStudyCount) * 100) : 0;
    
    // Missed sentences (lowest accuracy among studied)
    const missed = [...sentences]
      .filter(s => s.studyCount > 0)
      .sort((a, b) => (a.correctCount / (a.studyCount || 1)) - (b.correctCount / (b.studyCount || 1)))
      .slice(0, 5);

    return { totalSentences, totalStudyCount, overallAccuracy, missed };
  }, [sentences]);

  // Export / Import Backup JSON
  const exportData = () => {
    const backup = {
      version: STORAGE_VERSION,
      exportDate: new Date().toISOString(),
      sentences,
      records,
      sessions
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentenceflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("학습 데이터가 JSON 파일로 백업되었습니다.");
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result);
        if (data.sentences && Array.isArray(data.sentences)) {
          setSentences(data.sentences);
          if (data.records) setRecords(data.records);
          if (data.sessions) setSessions(data.sessions);
          showToast("데이터 복원이 완료되었습니다!");
        } else {
          showToast("올바르지 않은 백업 파일 형식입니다.");
        }
      } catch (err) {
        showToast("JSON 파일 파싱 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleFullReset = () => {
    setSentences([]);
    setRecords([]);
    setSessions([]);
    localStorage.removeItem(SENTENCES_KEY);
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(SESSIONS_KEY);
    setActiveModal(null);
    showToast("모든 데이터가 성공적으로 초기화되었습니다.");
    setCurrentView('dashboard');
  };

  // ==========================================
  // RENDER APP UI
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 transition-all duration-300 border border-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100">
            {activeModal === 'delete' && (
              <>
                <h3 className="text-xl font-bold text-slate-900 mb-2">문장 삭제</h3>
                <p className="text-slate-600 text-sm mb-6">정말 이 문장을 삭제하시겠습니까? 등록된 문장에서 영구적으로 삭제됩니다.</p>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    취소
                  </button>
                  <button 
                    onClick={() => handleDeleteSentence(modalData.id)} 
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
            {activeModal === 'reset' && (
              <>
                <h3 className="text-xl font-bold text-rose-600 mb-2">데이터 전체 초기화</h3>
                <p className="text-slate-600 text-sm mb-6">등록된 모든 문장과 누적된 학습 기록이 삭제됩니다. 계속하시겠습니까?</p>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setActiveModal(null)} 
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleFullReset} 
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
                  >
                    초기화 실행
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-200">
              SF
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                SentenceFlow
              </span>
              <span className="hidden sm:inline-block ml-2.5 text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                스마트 영어 학습
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              대시보드
            </button>
            <button 
              onClick={() => setCurrentView('list')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${currentView === 'list' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              문장 목록
            </button>
            <button 
              onClick={() => { setEditingSentenceId(null); setCurrentView('form'); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${currentView === 'form' && !editingSentenceId ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              문장 등록
            </button>
            <button 
              onClick={() => setCurrentView('study-setup')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${currentView === 'study-setup' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              학습 세션
            </button>
            <button 
              onClick={() => setCurrentView('stats')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${currentView === 'stats' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              학습 통계
            </button>
          </nav>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentView('study-setup')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition flex items-center space-x-1.5"
            >
              <span>학습 시작</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-6 py-2 flex justify-between items-center shadow-lg">
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center space-y-1 ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span className="text-[10px] font-medium">홈</span>
        </button>
        <button onClick={() => setCurrentView('list')} className={`flex flex-col items-center space-y-1 ${currentView === 'list' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          <span className="text-[10px] font-medium">목록</span>
        </button>
        <button onClick={() => { setEditingSentenceId(null); setCurrentView('form'); }} className={`flex flex-col items-center space-y-1 ${currentView === 'form' && !editingSentenceId ? 'text-indigo-600' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          <span className="text-[10px] font-medium">등록</span>
        </button>
        <button onClick={() => setCurrentView('study-setup')} className={`flex flex-col items-center space-y-1 ${currentView === 'study-setup' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <span className="text-[10px] font-medium">학습</span>
        </button>
        <button onClick={() => setCurrentView('stats')} className={`flex flex-col items-center space-y-1 ${currentView === 'stats' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span className="text-[10px] font-medium">통계</span>
        </button>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16 md:mb-0">
        
        {/* ================= VIEW: DASHBOARD ================= */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            {/* Banner */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl space-y-4">
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  Smart English Practice
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                  단어 배열과 직접 영작으로 <br/>영어 표현을 완벽하게 내 것으로!
                </h1>
                <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
                  자신의 학습 속도에 맞추어 원하는 문장을 직접 등록하고 반복 학습해보세요.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => setCurrentView('study-setup')}
                    className="bg-white text-indigo-700 font-bold px-6 py-3 rounded-2xl shadow-md hover:bg-indigo-50 transition transform active:scale-95 text-sm"
                  >
                    학습 시작하기
                  </button>
                  <button 
                    onClick={() => { setEditingSentenceId(null); setCurrentView('form'); }}
                    className="bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-indigo-400/40 font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-xs text-sm"
                  >
                    새 문장 등록
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">등록 문장</span>
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl text-lg">📝</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-slate-900">{statsSummary.totalSentences}</span>
                  <span className="text-xs text-slate-500 ml-1">개</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">누적 학습</span>
                  <span className="p-2 bg-violet-50 text-violet-600 rounded-2xl text-lg">🎯</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-slate-900">{statsSummary.totalStudyCount}</span>
                  <span className="text-xs text-slate-500 ml-1">회</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">평균 정답률</span>
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl text-lg">📈</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-slate-900">{statsSummary.overallAccuracy}</span>
                  <span className="text-xs text-slate-500 ml-1">%</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">즐겨찾기</span>
                  <span className="p-2 bg-amber-50 text-amber-500 rounded-2xl text-lg">⭐</span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-slate-900">{sentences.filter(s => s.isFavorite).length}</span>
                  <span className="text-xs text-slate-500 ml-1">개</span>
                </div>
              </div>
            </div>

            {/* Dashboard Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Sentences */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-slate-900">최근 등록된 문장</h2>
                  <button onClick={() => setCurrentView('list')} className="text-xs font-bold text-indigo-600 hover:underline">
                    전체 목록 보기 &rarr;
                  </button>
                </div>
                {sentences.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 text-sm mb-3">아직 등록된 문장이 없습니다.</p>
                    <button 
                      onClick={() => { setEditingSentenceId(null); setCurrentView('form'); }}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      문장 등록하기
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentences.slice(0, 4).map(s => (
                      <div key={s.id} className="p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-100 transition flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">{s.category || '일반'}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${s.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' : s.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                              {s.difficulty}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{s.englishText}</p>
                          <p className="text-xs text-slate-500">{s.koreanMeaning}</p>
                        </div>
                        <button onClick={(e) => handleToggleFavorite(s.id, e)} className="text-xl p-2 hover:scale-110 transition">
                          {s.isFavorite ? '⭐' : '☆'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Export / Import Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 mb-2">백업 및 데이터 관리</h2>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    등록한 문장과 누적된 학습 데이터를 JSON 형태로 보관하거나 다른 기기로 백업을 복원할 수 있습니다.
                  </p>
                  <div className="space-y-3">
                    <button 
                      onClick={exportData}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center space-x-2"
                    >
                      <span>📥 JSON 백업 파일 다운로드</span>
                    </button>
                    <label className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center space-x-2 cursor-pointer">
                      <span>📤 백업 파일에서 복원하기</span>
                      <input type="file" accept=".json" onChange={importData} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6">
                  <button 
                    onClick={() => setActiveModal('reset')}
                    className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition"
                  >
                    데이터 전체 초기화
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW: SENTENCE LIST ================= */}
        {currentView === 'list' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">문장 보관함</h1>
                <p className="text-slate-500 text-sm">등록한 문장을 조회하고 필터링하거나 수정할 수 있습니다.</p>
              </div>
              <button 
                onClick={() => { setEditingSentenceId(null); setCurrentView('form'); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-md shadow-indigo-100 transition self-start md:self-auto"
              >
                + 새 문장 등록
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</span>
                  <input 
                    type="text" 
                    placeholder="영어 문장, 한국어 뜻, 메모 검색..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <select 
                    value={filterCategory} 
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">전체 카테고리</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>

                  <select 
                    value={filterDifficulty} 
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">전체 난이도</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>

                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">전체 상태</option>
                    <option value="favorite">즐겨찾기 ⭐</option>
                    <option value="studied">학습 완료</option>
                    <option value="unstudied">미학습</option>
                  </select>

                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="latest">최신 등록순</option>
                    <option value="oldest">오래된순</option>
                    <option value="alphabetical">알파벳순</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List */}
            {filteredSentences.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-sm mb-3">조건에 부합하는 문장이 없습니다.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setFilterCategory('all'); setFilterDifficulty('all'); setFilterStatus('all'); }}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl"
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSentences.map(s => {
                  const accuracy = s.studyCount > 0 ? Math.round((s.correctCount / s.studyCount) * 100) : 0;
                  return (
                    <div key={s.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{s.category || '기본'}</span>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${s.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' : s.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                              {s.difficulty}
                            </span>
                          </div>
                          <button onClick={(e) => handleToggleFavorite(s.id, e)} className="text-xl">
                            {s.isFavorite ? '⭐' : '☆'}
                          </button>
                        </div>
                        <p className="text-base font-extrabold text-slate-900">{s.englishText}</p>
                        <p className="text-sm text-slate-600">{s.koreanMeaning}</p>
                        {s.memo && <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl">💡 {s.memo}</p>}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center space-x-3">
                          <span>학습: <strong className="text-slate-700">{s.studyCount}회</strong></span>
                          <span>정답률: <strong className="text-slate-700">{accuracy}%</strong></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => { setEditingSentenceId(s.id); setCurrentView('form'); }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                          >
                            수정
                          </button>
                          <button 
                            onClick={() => { setModalData(s); setActiveModal('delete'); }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW: SENTENCE FORM ================= */}
        {currentView === 'form' && (
          <SentenceFormView 
            sentenceToEdit={sentences.find(s => s.id === editingSentenceId)}
            onSave={handleSaveSentence}
            onCancel={() => setCurrentView('list')}
          />
        )}

        {/* ================= VIEW: STUDY SETUP ================= */}
        {currentView === 'study-setup' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm space-y-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">학습 환경 설정</h1>
              <p className="text-slate-500 text-sm">학습 모드와 출제 범위를 맞춤 설정하세요.</p>
            </div>

            {/* Mode Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">1. 학습 모드</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => setStudyConfig({ ...studyConfig, mode: 'word-arrange' })}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${studyConfig.mode === 'word-arrange' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <span className="text-2xl mb-2">🧩</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">단어 배열하기</p>
                    <p className="text-xs text-slate-500 mt-0.5">조각 단어를 클릭해 올바른 순서로 완성</p>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => setStudyConfig({ ...studyConfig, mode: 'typing' })}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${studyConfig.mode === 'typing' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <span className="text-2xl mb-2">⌨️</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">직접 영작하기</p>
                    <p className="text-xs text-slate-500 mt-0.5">영문 전체를 직접 입력하여 완벽 암기</p>
                  </div>
                </button>

                <button 
                  type="button"
                  onClick={() => setStudyConfig({ ...studyConfig, mode: 'mixed' })}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${studyConfig.mode === 'mixed' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <span className="text-2xl mb-2">🔄</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">혼합 학습</p>
                    <p className="text-xs text-slate-500 mt-0.5">두 모드가 무작위로 교차 출제됨</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Scope Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">2. 출제 범위</label>
              <select 
                value={studyConfig.scope}
                onChange={(e) => setStudyConfig({ ...studyConfig, scope: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">전체 문장 ({sentences.length}개)</option>
                <option value="favorites">즐겨찾기 문장 ({sentences.filter(s => s.isFavorite).length}개)</option>
                <option value="unstudied">미학습 문장 ({sentences.filter(s => s.studyCount === 0).length}개)</option>
                <option value="incorrect">오답 복습</option>
                <option value="category">특정 카테고리</option>
              </select>

              {studyConfig.scope === 'category' && (
                <select 
                  value={studyConfig.categoryFilter}
                  onChange={(e) => setStudyConfig({ ...studyConfig, categoryFilter: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 mt-2"
                >
                  <option value="">카테고리 선택</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              )}
            </div>

            {/* Questions count & Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">3. 문제 수</label>
                <select 
                  value={studyConfig.questionCount}
                  onChange={(e) => setStudyConfig({ ...studyConfig, questionCount: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value={5}>5문장</option>
                  <option value={10}>10문장</option>
                  <option value={20}>20문장</option>
                  <option value={1000}>전체 문장</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">4. 출제 순서</label>
                <select 
                  value={studyConfig.order}
                  onChange={(e) => setStudyConfig({ ...studyConfig, order: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="random">랜덤 섞기</option>
                  <option value="sequential">등록순</option>
                  <option value="incorrect-first">오답 우선</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={startStudySession}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-200 transition transform active:scale-98"
              >
                학습 세션 시작하기 &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW: ACTIVE STUDY ================= */}
        {currentView === 'study' && activeSessionQueue.length > 0 && (() => {
          const currentSentence = activeSessionQueue[currentIndex];
          const actualMode = studyConfig.mode === 'mixed' 
            ? ((currentIndex % 2 === 0) ? 'word-arrange' : 'typing') 
            : studyConfig.mode;
          const progressPercent = Math.round(((currentIndex) / activeSessionQueue.length) * 100);

          return (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Progress Bar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-extrabold text-indigo-600 uppercase tracking-wider text-xs">
                    {actualMode === 'word-arrange' ? '🧩 단어 배열' : '⌨️ 직접 영작'}
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="font-extrabold text-slate-700">문제 {currentIndex + 1} / {activeSessionQueue.length}</span>
                    <button 
                      onClick={() => setCurrentView('dashboard')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                    >
                      종료
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              {/* Prompt */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center space-y-3">
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-indigo-50 text-indigo-600">{currentSentence.category || '일반'}</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{currentSentence.koreanMeaning}</h2>
                {currentSentence.memo && <p className="text-xs text-slate-400">💡 {currentSentence.memo}</p>}
              </div>

              {/* MODE A: WORD ARRANGEMENT */}
              {actualMode === 'word-arrange' && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">완성된 문장 영역 (클릭시 제거)</label>
                    <div className="min-h-[80px] p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-wrap gap-2 items-center">
                      {assembledWords.length === 0 ? (
                        <span className="text-slate-400 text-sm">아래의 단어를 클릭하여 문장을 조합하세요.</span>
                      ) : (
                        assembledWords.map(w => (
                          <button
                            key={w.id}
                            onClick={() => handleReturnAssembledWord(w)}
                            disabled={wordCheckResult === 'correct'}
                            className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition"
                          >
                            {w.text}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">단어 조각 목록</label>
                    <div className="min-h-[80px] p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap gap-2 items-center">
                      {poolWords.map(w => (
                        <button
                          key={w.id}
                          onClick={() => handleSelectPoolWord(w)}
                          disabled={wordCheckResult === 'correct'}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 font-bold rounded-xl border border-slate-200 transition shadow-xs"
                        >
                          {w.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback or Actions */}
                  {wordCheckResult === 'correct' ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                      <p className="text-emerald-700 font-extrabold text-lg">🎉 정답입니다!</p>
                      <button 
                        onClick={handleNextQuestion}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                      >
                        다음 문제 &rarr;
                      </button>
                    </div>
                  ) : wordCheckResult === 'incorrect' ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
                      <div>
                        <p className="text-rose-700 font-extrabold text-base">⚠️ 정답이 아닙니다.</p>
                        <p className="text-xs text-slate-600 mt-1">정답: <strong className="text-slate-900">{currentSentence.englishText}</strong></p>
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={handleResetWordArrange}
                          className="flex-1 py-3 bg-white border border-rose-200 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition text-sm"
                        >
                          다시 조합하기
                        </button>
                        <button 
                          onClick={handleNextQuestion}
                          className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition text-sm"
                        >
                          다음 문제
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2">
                      <button 
                        onClick={handleResetWordArrange}
                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition"
                      >
                        초기화
                      </button>
                      <button 
                        onClick={handleCheckWordArrange}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-md transition text-sm"
                      >
                        정답 확인
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODE B: DIRECT TYPING */}
              {actualMode === 'typing' && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">영어 문장 타이핑</label>
                    <textarea 
                      rows={3}
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      disabled={typingCheckResult === 'correct'}
                      placeholder="Type the English sentence here..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (typingCheckResult !== 'correct') handleCheckTyping();
                        }
                      }}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:border-indigo-500 transition resize-none font-medium"
                    />
                  </div>

                  {/* Feedback or Actions */}
                  {typingCheckResult === 'correct' ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                      <p className="text-emerald-700 font-extrabold text-lg">🎉 정답입니다!</p>
                      <button 
                        onClick={handleNextQuestion}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition"
                      >
                        다음 문제 &rarr;
                      </button>
                    </div>
                  ) : typingCheckResult === 'incorrect' ? (
                    <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
                      <div className="space-y-2 text-left">
                        <p className="text-rose-700 font-extrabold text-base text-center">⚠️ 오답입니다.</p>
                        <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs space-y-1">
                          <p><span className="font-bold text-slate-500">입력한 답:</span> <span className="text-rose-600">{typedAnswer}</span></p>
                          <p><span className="font-bold text-slate-500">정답 문장:</span> <span className="text-emerald-600 font-bold">{currentSentence.englishText}</span></p>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => setTypingCheckResult('idle')}
                          className="flex-1 py-3 bg-white border border-rose-200 text-rose-700 font-bold rounded-xl hover:bg-rose-100 transition text-sm"
                        >
                          다시 입력
                        </button>
                        <button 
                          onClick={handleNextQuestion}
                          className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition text-sm"
                        >
                          다음 문제
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2">
                      <button 
                        onClick={() => setShowAnswerInTyping(!showAnswerInTyping)}
                        className="px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-2xl text-xs transition"
                      >
                        {showAnswerInTyping ? '힌트 숨기기' : '💡 힌트 보기'}
                      </button>
                      <button 
                        onClick={handleCheckTyping}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-md transition text-sm"
                      >
                        정답 제출
                      </button>
                    </div>
                  )}

                  {showAnswerInTyping && typingCheckResult !== 'correct' && (
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-amber-900 text-sm">
                      <p className="font-bold mb-1">정답 힌트:</p>
                      <p className="font-mono text-base">{currentSentence.englishText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= VIEW: STUDY RESULT ================= */}
        {currentView === 'result' && lastCompletedSession && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm space-y-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-bold shadow-md">
                🏆
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">학습 세션 완료!</h1>
              <p className="text-slate-500 text-sm">수고하셨습니다. 이번 학습 세션의 주요 결과입니다.</p>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">총 문제 수</span>
                <span className="text-2xl font-extrabold text-slate-900">{lastCompletedSession.totalQuestions}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">정답 수</span>
                <span className="text-2xl font-extrabold text-emerald-600">{lastCompletedSession.correctCount}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">원샷 정답</span>
                <span className="text-2xl font-extrabold text-indigo-600">{lastCompletedSession.firstTryCorrectCount}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">정답률</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {Math.round((lastCompletedSession.correctCount / lastCompletedSession.totalQuestions) * 100)}%
                </span>
              </div>
            </div>

            {/* Incorrect sentences summary */}
            {lastCompletedSession.incorrectSentenceIds.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">틀린 문장 목록</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lastCompletedSession.incorrectSentenceIds.map(id => {
                    const s = sentences.find(item => item.id === id);
                    if (!s) return null;
                    return (
                      <div key={id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{s.englishText}</p>
                          <p className="text-slate-500">{s.koreanMeaning}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => setCurrentView('study-setup')}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition text-center text-sm"
              >
                다시 학습하기
              </button>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition text-center text-sm"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW: STATS ================= */}
        {currentView === 'stats' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">누적 학습 통계</h1>
              <p className="text-slate-500 text-sm">나의 전체적인 학습 성과와 취약 영역을 확인하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">누적 학습 완료 세션</span>
                <span className="text-4xl font-extrabold text-slate-900">{sessions.length}</span>
                <span className="text-xs text-slate-500 ml-1">회</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">누적 정답 문장</span>
                <span className="text-4xl font-extrabold text-emerald-600">
                  {sentences.reduce((acc, s) => acc + s.correctCount, 0)}
                </span>
                <span className="text-xs text-slate-500 ml-1">개</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">평균 정답률</span>
                <span className="text-4xl font-extrabold text-indigo-600">{statsSummary.overallAccuracy}%</span>
              </div>
            </div>

            {/* Weakest sentences */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900">복습이 필요한 문장 Top 5</h2>
              {statsSummary.missed.length === 0 ? (
                <p className="text-slate-400 text-sm py-6 text-center">아직 학습 기록이 충분하지 않습니다.</p>
              ) : (
                <div className="space-y-3">
                  {statsSummary.missed.map(s => {
                    const acc = s.studyCount > 0 ? Math.round((s.correctCount / s.studyCount) * 100) : 0;
                    return (
                      <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-sm">{s.englishText}</p>
                          <p className="text-xs text-slate-500">{s.koreanMeaning}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-rose-600">{acc}%</span>
                          <p className="text-[10px] text-slate-400">정답률</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto text-center text-xs text-slate-400">
        <p>© 2026 SentenceFlow. Built for seamless English mastery.</p>
      </footer>
    </div>
  );
}

// ==========================================
// SUB-COMPONENT: SENTENCE FORM VIEW
// ==========================================
function SentenceFormView({ sentenceToEdit, onSave, onCancel }) {
  const [englishText, setEnglishText] = useState(sentenceToEdit?.englishText || '');
  const [koreanMeaning, setKoreanMeaning] = useState(sentenceToEdit?.koreanMeaning || '');
  const [category, setCategory] = useState(sentenceToEdit?.category || '기초');
  const [difficulty, setDifficulty] = useState(sentenceToEdit?.difficulty || 'Easy');
  const [memo, setMemo] = useState(sentenceToEdit?.memo || '');
  const [isFavorite, setIsFavorite] = useState(sentenceToEdit?.isFavorite || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      englishText,
      koreanMeaning,
      category,
      difficulty,
      memo,
      isFavorite
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
          {sentenceToEdit ? '문장 수정하기' : '새 영어 문장 등록'}
        </h1>
        <p className="text-slate-500 text-sm">학습할 영어 문장과 한국어 뜻을 등록하세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            영어 문장 <span className="text-rose-500">*</span>
          </label>
          <textarea 
            rows={3}
            required
            value={englishText}
            onChange={(e) => setEnglishText(e.target.value)}
            placeholder="예: I want to learn English fluently."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 transition resize-none font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            한국어 뜻 <span className="text-rose-500">*</span>
          </label>
          <input 
            type="text"
            required
            value={koreanMeaning}
            onChange={(e) => setKoreanMeaning(e.target.value)}
            placeholder="예: 나는 영어를 유창하게 배우고 싶다."
            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 transition font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">카테고리</label>
            <input 
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 비즈니스, 일상, 여행"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">난이도</label>
            <select 
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="Easy">Easy (쉬움)</option>
              <option value="Medium">Medium (보통)</option>
              <option value="Hard">Hard (어려움)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">메모 / 문법 힌트</label>
          <input 
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: want to + 동사원형 표현"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <input 
            type="checkbox"
            id="favoriteCheckbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <label htmlFor="favoriteCheckbox" className="text-sm font-bold text-slate-700 cursor-pointer">
            즐겨찾기 문장으로 등록 ⭐
          </label>
        </div>

        <div className="flex space-x-3 pt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition text-sm"
          >
            취소
          </button>
          <button 
            type="submit"
            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition text-sm"
          >
            {sentenceToEdit ? '수정 완료' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  );
}