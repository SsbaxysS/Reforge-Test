import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, push } from 'firebase/database';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }

    const resultsRef = ref(db, `testResults/${currentUser.uid}`);
    const unsubResults = onValue(resultsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr: TestResult[] = Object.entries(data).map(([id, val]) => ({
          id,
          ...(val as Omit<TestResult, 'id'>)
        }));
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
        const arr: Message[] = Object.entries(data).map(([id, val]) => ({
          id,
          ...(val as Omit<Message, 'id'>)
        }));
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="glass rounded-3xl p-8 mb-8 animate-fade-in-up" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                boxShadow: '0 8px 25px var(--accent-glow)'
              }}
            >
              {userProfile.firstName.charAt(0)}{userProfile.lastName.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {userProfile.firstName} {userProfile.lastName}
              </h1>
              <p className="mt-1" style={{ color: 'var(--text-muted)' }}>{userProfile.email}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span
                  className="px-3 py-1 text-xs font-medium rounded-lg"
                  style={{
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ID: {userProfile.uid.substring(0, 8)}...
                </span>
                {userProfile.admin && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg border border-amber-500/20">
                    👑 Администратор
                  </span>
                )}
                {userProfile.suspiciousFlag && (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg border border-red-500/20">
                    ⚠️ Подозрительная активность
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Тестов пройдено', value: testResults.length, gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
              { label: 'Средний балл', value: `${avgScore}%`, gradient: 'linear-gradient(135deg, #22c55e, #10b981)' },
              { label: 'Лучший результат', value: testResults.length > 0 ? `${Math.round(Math.max(...testResults.map(t => (t.score / t.maxScore) * 100)))}%` : '—', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
              { label: 'Сообщений', value: messages.filter(m => m.from === currentUser?.uid).length, gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl text-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div
                  className="text-2xl font-extrabold"
                  style={{
                    background: stat.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['tests', 'messages'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300"
              style={activeTab === tab ? {
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
                boxShadow: '0 4px 15px var(--accent-glow)'
              } : {
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {tab === 'tests' ? '📝 Мои тесты' : '💬 Сообщения'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'tests' ? (
          <div className="space-y-4 animate-fade-in-up">
            {testResults.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Тесты не найдены</h3>
                <p style={{ color: 'var(--text-muted)' }}>Вы еще не проходили ни одного теста</p>
              </div>
            ) : (
              testResults.map(result => {
                const percent = Math.round((result.score / result.maxScore) * 100);
                const getGradient = () => {
                  if (percent >= 80) return 'linear-gradient(135deg, #22c55e, #10b981)';
                  if (percent >= 60) return 'linear-gradient(135deg, #f59e0b, #ef4444)';
                  return 'linear-gradient(135deg, #ef4444, #dc2626)';
                };
                return (
                  <div
                    key={result.id}
                    className="glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5"
                    style={{ boxShadow: 'var(--shadow-card)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{result.testName}</h3>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                          {new Date(result.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-2xl font-black"
                          style={{
                            background: getGradient(),
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                        >
                          {percent}%
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{result.score}/{result.maxScore}</div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${percent}%`, background: getGradient() }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="glass rounded-3xl overflow-hidden animate-fade-in-up" style={{ boxShadow: 'var(--shadow-card)' }}>
            {/* Chat header */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--accent-primary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Чат с учителем
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Задайте вопрос по результатам тестов</p>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                  Напишите первое сообщение учителю
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.from === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[75%] px-4 py-3 rounded-2xl"
                      style={msg.from === currentUser?.uid ? {
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        color: 'white'
                      } : {
                        background: 'var(--bg-card-hover)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {msg.from !== currentUser?.uid && (
                        <div className="text-xs text-amber-400 font-semibold mb-1">Учитель</div>
                      )}
                      <p className="text-sm">{msg.text}</p>
                      <div className="text-xs mt-1 opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Введите сообщение..."
                  className="flex-1 px-4 py-3 rounded-xl transition-all outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-3 text-white font-medium rounded-xl transition-all disabled:opacity-30"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    boxShadow: '0 4px 15px var(--accent-glow)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
