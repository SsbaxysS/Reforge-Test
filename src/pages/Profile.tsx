import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, push, set, get } from 'firebase/database';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { Test, TestSubmission } from '@/types/test';

interface TestResult {
  id: string;
  testId: string;
  testName: string;
  score: number;
  maxScore: number;
  completedAt: number;
  fingerprint: string;
  timeTaken?: number;
  submissionId?: string; // We'll add this mapping to make it easier, or query by testId + userId
}

interface Message {
  id: string;
  from: string;
  fromName: string;
  text: string;
  timestamp: number;
}

export default function Profile() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'tests' | 'messages'>('tests');
  const [editingName, setEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Detailed Modal State
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [testDetails, setTestDetails] = useState<Test | null>(null);
  const [submissionDetails, setSubmissionDetails] = useState<TestSubmission | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const startEditName = () => {
    setEditFirstName(userProfile?.firstName || '');
    setEditLastName(userProfile?.lastName || '');
    setEditingName(true);
  };

  const saveName = async () => {
    if (!currentUser || !editFirstName.trim() || !editLastName.trim()) return;
    setSavingName(true);
    try {
      await set(ref(db, `users/${currentUser.uid}/firstName`), editFirstName.trim());
      await set(ref(db, `users/${currentUser.uid}/lastName`), editLastName.trim());
      setEditingName(false);
      toast.success('Имя успешно изменено');
    } catch (e) {
      toast.error('Не удалось сохранить изменения');
      console.error('Failed to save name:', e);
    }
    setSavingName(false);
  };

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }

    const resultsRef = ref(db, `testResults/${currentUser.uid}`);
    const unsubResults = onValue(resultsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr: TestResult[] = Object.entries(data).map(([id, val]) => ({ id, ...(val as Omit<TestResult, 'id'>) }));
        arr.sort((a, b) => b.completedAt - a.completedAt);
        setTestResults(arr);
      } else {
        setTestResults([]);
      }
    });

    const msgRef = ref(db, `messages/${currentUser.uid}`);
    const unsubMsg = onValue(msgRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr: Message[] = Object.entries(data).map(([id, val]) => ({ id, ...(val as Omit<Message, 'id'>) }));
        arr.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(arr);
      } else {
        setMessages([]);
      }
    });

    return () => { unsubResults(); unsubMsg(); };
  }, [currentUser, navigate]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const msgRef = ref(db, `messages/${currentUser.uid}`);
    await push(msgRef, {
      from: currentUser.uid,
      fromName: `${userProfile?.firstName} ${userProfile?.lastName}`,
      text: newMessage.trim(),
      timestamp: Date.now()
    });
    const adminMsgRef = ref(db, `adminNotifications`);
    await push(adminMsgRef, {
      userId: currentUser.uid,
      userName: `${userProfile?.firstName} ${userProfile?.lastName}`,
      text: newMessage.trim(),
      timestamp: Date.now(),
      read: false
    });
    setNewMessage('');
  };

  const avgScore = testResults.length > 0
    ? Math.round(testResults.reduce((a, t) => a + (t.score / t.maxScore) * 100, 0) / testResults.length)
    : 0;

  const openTestDetails = async (result: TestResult) => {
    setSelectedResult(result);
    setLoadingDetails(true);
    setTestDetails(null);
    setSubmissionDetails(null);

    try {
      // Fetch Test
      const testSnap = await get(ref(db, `tests/${result.testId}`));
      if (testSnap.exists()) {
        setTestDetails(testSnap.val() as Test);
      }

      // Fetch Submission using submissionId if it exists, otherwise find it
      const subsSnap = await get(ref(db, `testSubmissions/${result.testId}`));
      if (subsSnap.exists()) {
        const subs = Object.entries(subsSnap.val());
        // Find by userId and timestamps closely matching
        const sub = subs.find(([_id, val]: [string, any]) =>
          val.userId === currentUser?.uid && Math.abs(val.submittedAt - result.completedAt) < 5000
        );
        if (sub) {
          setSubmissionDetails(sub[1] as TestSubmission);
        }
      }
    } catch (e) {
      console.error('Error fetching details', e);
      toast.error('Ошибка загрузки деталей');
    }
    setLoadingDetails(false);
  };

  const closeDetails = () => {
    setSelectedResult(null);
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Profile card */}
        <div className="rounded-2xl p-6 mb-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ background: 'var(--accent)' }}>
              {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
            </div>
            <div className="flex-1">
              {editingName ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Имя" className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-100)' }} />
                    <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Фамилия" className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-100)' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveName} disabled={savingName || !editFirstName.trim() || !editLastName.trim()}
                      className="text-[11px] px-3 py-1 rounded-lg font-medium text-white disabled:opacity-40"
                      style={{ background: 'var(--accent)' }}>
                      {savingName ? '...' : '✓ Сохранить'}
                    </button>
                    <button onClick={() => setEditingName(false)} className="text-[11px] px-3 py-1 rounded-lg"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-500)' }}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>
                    {userProfile.firstName} {userProfile.lastName}
                  </h1>
                  <button onClick={startEditName} className="text-[11px] px-2 py-0.5 rounded-md transition-all hover:opacity-80"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-600)' }} title="Редактировать имя">
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-500)' }}>{userProfile.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ color: 'var(--text-600)', border: '1px solid var(--border)' }}>
                  ID: {userProfile.uid.substring(0, 8)}
                </span>
                {userProfile.admin && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ color: 'var(--accent-light)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                    Администратор
                  </span>
                )}
                {userProfile.suspiciousFlag && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}
                    title={`Очки: ${userProfile.suspiciousScore || 0}. ${(userProfile.suspiciousReasons || []).join(', ')}`}>
                    ⚠ Подозрительная активность ({userProfile.suspiciousScore || 0})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Тестов', value: testResults.length },
              { label: 'Средний балл', value: `${avgScore}%` },
              { label: 'Лучший', value: testResults.length > 0 ? `${Math.round(Math.max(...testResults.map(t => (t.score / t.maxScore) * 100)))}%` : '—' },
              { label: 'Сообщений', value: messages.filter(m => m.from === currentUser?.uid).length },
            ].map((s, i) => (
              <div key={i} className="text-center py-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>{s.value}</div>
                <div className="text-[11px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 p-1 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {(['tests', 'messages'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 py-2 text-[13px] font-medium transition-colors"
              style={{ color: activeTab === tab ? '#fff' : 'var(--text-500)', WebkitTapHighlightColor: 'transparent' }}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--accent)' }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab === 'tests' ? 'Мои тесты' : 'Сообщения'}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'tests' ? (
          <div className="space-y-3 animate-fade-in-up">
            {testResults.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-200)' }}>Тесты не найдены</h3>
                <p className="text-[13px]" style={{ color: 'var(--text-500)' }}>Вы еще не проходили ни одного теста</p>
              </div>
            ) : (
              testResults.map(result => {
                const percent = Math.round((result.score / result.maxScore) * 100);
                const color = percent >= 80 ? 'var(--green)' : percent >= 60 ? 'var(--amber)' : 'var(--red)';
                return (
                  <div key={result.id} className="glow-card rounded-2xl p-5 transition-all duration-500 cursor-pointer"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    onClick={() => openTestDetails(result)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[15px]" style={{ color: 'var(--text-100)' }}>{result.testName}</h3>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-600)' }}>
                          {new Date(result.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {result.timeTaken !== undefined && ` · ⏱ ${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold" style={{ color }}>{percent}%</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-600)' }}>{result.score}/{result.maxScore}</div>
                      </div>
                    </div>
                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            {/* Chat header */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-100)' }}>Чат с учителем</h3>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-600)' }}>Задайте вопрос по результатам тестов</p>
            </div>

            {/* Messages */}
            <div className="h-60 sm:h-80 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-600)' }}>
                  Напишите первое сообщение
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.from === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] px-3.5 py-2.5 rounded-xl"
                      style={msg.from === currentUser?.uid
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { background: 'var(--bg-card-hover)', color: 'var(--text-200)', border: '1px solid var(--border)' }
                      }
                    >
                      {msg.from !== currentUser?.uid && (
                        <div className="text-[10px] font-semibold mb-1" style={{ color: 'var(--accent-light)' }}>Учитель</div>
                      )}
                      <p className="text-[13px]">{msg.text}</p>
                      <div className="text-[10px] mt-1 opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input Bottom */}
            {activeTab === 'messages' && (
              <div className="fixed bottom-0 left-0 right-0 sm:static bg-opacity-90 backdrop-blur-md p-4 sm:p-0 sm:mt-4 sm:bg-transparent"
                style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', zIndex: 40 }}>
                <div className="max-w-5xl mx-auto flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Сообщение учителю..."
                    className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-100)' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 rounded-xl font-medium text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                  >
                    Отправить
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Result Modal */}
      <AnimatePresence>
        {selectedResult && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={closeDetails}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              {/* Header */}
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-100)' }}>{selectedResult.testName}</h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-500)' }}>
                    Оценка: {selectedResult.score} / {selectedResult.maxScore} баллов
                    {selectedResult.timeTaken && ` · Время: ${Math.floor(selectedResult.timeTaken / 60)}:${(selectedResult.timeTaken % 60).toString().padStart(2, '0')}`}
                  </p>
                </div>
                <button onClick={closeDetails} className="p-2 rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10" style={{ color: 'var(--text-500)' }}>
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-6">
                {loadingDetails ? (
                  <div className="flex justify-center p-10">
                    <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                  </div>
                ) : testDetails && submissionDetails ? (
                  testDetails.stages.map((stage, sIdx) => (
                    <div key={stage.id} className="space-y-4">
                      <h3 className="text-lg font-bold" style={{ color: 'var(--text-200)' }}>
                        {testDetails.stages.length > 1 ? `${sIdx + 1}. ` : ''}{stage.title}
                      </h3>
                      <div className="space-y-4">
                        {stage.questions.map((q, qIdx) => {
                          const ans = submissionDetails.answers[q.id];
                          const isCheckbox = q.options.filter(o => o.correct).length > 1;

                          let isCorrectAll = false;
                          let pointsEarned = 0;

                          if (q.type === 'text') {
                            const normalizedAns = String(ans || '').trim().toLowerCase();
                            isCorrectAll = q.correctAnswers.some(ca => ca.trim().toLowerCase() === normalizedAns);
                            pointsEarned = isCorrectAll ? q.points : 0;
                          } else {
                            if (isCheckbox) {
                              const ansArr = Array.isArray(ans) ? ans : [];
                              const totalCorrect = q.options.filter(o => o.correct).length;
                              let correctHits = 0;
                              let incorrectHits = 0;

                              ansArr.forEach(idx => {
                                if (q.options[idx as number]?.correct) correctHits++;
                                else incorrectHits++;
                              });

                              if (testDetails.gradingMode === 'auto-complex') {
                                isCorrectAll = correctHits === totalCorrect && incorrectHits === 0;
                                const raw = (correctHits - incorrectHits) / totalCorrect;
                                pointsEarned = Math.max(0, raw * q.points);
                              } else {
                                isCorrectAll = correctHits === totalCorrect && incorrectHits === 0;
                                pointsEarned = isCorrectAll ? q.points : 0;
                              }
                            } else {
                              const ansNum = Number(ans);
                              isCorrectAll = q.options[ansNum]?.correct === true;
                              pointsEarned = isCorrectAll ? q.points : 0;
                            }
                          }

                          // Simplify floating point display
                          pointsEarned = Math.round(pointsEarned * 100) / 100;

                          return (
                            <div key={q.id} className="p-4 rounded-xl" style={{
                              background: 'var(--bg-card)',
                              border: `1px solid ${isCorrectAll ? 'var(--green-border, var(--border))' : 'var(--red-border, var(--border))'}`
                            }}>
                              <div className="flex justify-between items-start mb-3 gap-4">
                                <p className="text-[14px] font-medium leading-relaxed" style={{ color: 'var(--text-100)' }}>
                                  {qIdx + 1}. {q.text}
                                </p>
                                <span className="text-[11px] font-bold px-2 py-1 rounded-md whitespace-nowrap"
                                  style={{
                                    background: isCorrectAll ? 'var(--green-bg, transparent)' : 'var(--red-bg, transparent)',
                                    color: isCorrectAll ? 'var(--green)' : 'var(--red)',
                                    border: `1px solid ${isCorrectAll ? 'var(--green)' : 'var(--red)'}`
                                  }}>
                                  {pointsEarned} / {q.points}
                                </span>
                              </div>

                              <div className="space-y-2 mt-3">
                                {q.type === 'choice' ? (
                                  q.options.map((opt, oIdx) => {
                                    const isSelected = isCheckbox
                                      ? Array.isArray(ans) && ans.includes(oIdx)
                                      : Number(ans) === oIdx;

                                    const isCorrectOpt = opt.correct;

                                    let highlightClasses = "border-[var(--border)]";
                                    let icon = "";

                                    if (isSelected && isCorrectOpt) {
                                      highlightClasses = "border-[var(--green)] bg-[var(--green-bg)] text-[var(--green)]";
                                      icon = "✓";
                                    } else if (isSelected && !isCorrectOpt) {
                                      highlightClasses = "border-[var(--red)] bg-[var(--red-bg)] text-[var(--red)]";
                                      icon = "✗";
                                    } else if (!isSelected && isCorrectOpt) {
                                      highlightClasses = "border-[var(--green)] border-dashed text-[var(--text-400)]";
                                      icon = "✓ (пропущено)";
                                    }

                                    return (
                                      <div key={oIdx} className={`px-3 py-2 rounded-lg border text-sm flex items-start gap-2 ${highlightClasses}`}
                                        style={{ color: 'var(--text-200)' }}>
                                        <div className="min-w-[4px] mt-0.5">{icon}</div>
                                        <div>{opt.text}</div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="space-y-2">
                                    <div className="px-3 py-2 rounded-lg border text-sm"
                                      style={{
                                        borderColor: isCorrectAll ? 'var(--green)' : 'var(--red)',
                                        color: 'var(--text-200)',
                                        background: isCorrectAll ? 'var(--green-bg)' : 'var(--red-bg)'
                                      }}>
                                      <span className="text-[10px] uppercase tracking-wider block mb-1 opacity-70">Ваш ответ</span>
                                      {String(ans || '—')}
                                    </div>
                                    {!isCorrectAll && (
                                      <div className="px-3 py-2 rounded-lg border border-dashed border-[var(--green)] text-sm"
                                        style={{ color: 'var(--text-200)' }}>
                                        <span className="text-[10px] uppercase tracking-wider block mb-1 opacity-70" style={{ color: 'var(--green)' }}>Правильные варианты</span>
                                        {q.correctAnswers.join(' ИЛИ ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-10 text-sm" style={{ color: 'var(--text-500)' }}>
                    Детальная информация недоступна (возможно тест был удалён или перезаписан)
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
