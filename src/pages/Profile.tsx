import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, push, set } from 'firebase/database';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface TestResult {
  id: string;
  testName: string;
  score: number;
  maxScore: number;
  completedAt: number;
  fingerprint: string;
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
                  <div key={result.id} className="glow-card rounded-2xl p-5 transition-all duration-500"
                    style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[15px]" style={{ color: 'var(--text-100)' }}>{result.testName}</h3>
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-600)' }}>
                          {new Date(result.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

            {/* Input */}
            <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Сообщение..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-200)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-30"
                  style={{ background: 'var(--accent)' }}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
