import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderMarkdown } from '@/utils/markdown';
import { ref, onValue, remove, set, push, get } from 'firebase/database';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/contexts/AuthContext';
import TestEditor from '@/components/TestEditor';
import type { Test, TestSubmission } from '@/types/test';

interface FingerprintData { users: string[]; lastSeen: number; }

interface AdminNotification {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export default function AdminPanel() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fingerprints, setFingerprints] = useState<Record<string, FingerprintData>>({});
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, TestSubmission[]>>({});
  const [activeTab, setActiveTab] = useState<'users' | 'tests' | 'security' | 'messages'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showUserDetail, setShowUserDetail] = useState<UserProfile | null>(null);
  const [editingTest, setEditingTest] = useState<Test | null | 'new'>(null);
  const [viewSubmissions, setViewSubmissions] = useState<string | null>(null);
  const [previewTest, setPreviewTest] = useState<Test | null>(null);
  const [previewStage, setPreviewStage] = useState(0);

  useEffect(() => {
    if (!currentUser || !userProfile?.admin) { navigate('/'); return; }

    const unsubUsers = onValue(ref(db, 'users'), snap => {
      if (snap.exists()) setUsers(Object.values(snap.val()) as UserProfile[]);
    });
    const unsubFp = onValue(ref(db, 'fingerprints'), snap => {
      if (snap.exists()) setFingerprints(snap.val());
    });
    const unsubNotif = onValue(ref(db, 'adminNotifications'), snap => {
      if (snap.exists()) {
        const arr: AdminNotification[] = Object.entries(snap.val()).map(([id, val]) => ({ id, ...(val as Omit<AdminNotification, 'id'>) }));
        arr.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(arr);
      }
    });
    const unsubTests = onValue(ref(db, 'tests'), snap => {
      if (snap.exists()) {
        const arr: Test[] = Object.entries(snap.val()).map(([id, val]) => ({ ...(val as Test), id }));
        arr.sort((a, b) => b.createdAt - a.createdAt);
        setTests(arr);
      } else { setTests([]); }
    });
    const unsubSub = onValue(ref(db, 'testSubmissions'), snap => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, Record<string, TestSubmission>>;
        const result: Record<string, TestSubmission[]> = {};
        for (const [testId, subs] of Object.entries(data)) {
          result[testId] = Object.entries(subs).map(([id, v]) => ({ ...v, id }));
          result[testId].sort((a, b) => b.submittedAt - a.submittedAt);
        }
        setSubmissions(result);
      }
    });
    return () => { unsubUsers(); unsubFp(); unsubNotif(); unsubTests(); unsubSub(); };
  }, [currentUser, userProfile, navigate]);

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.uid}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const suspiciousUsers = users.filter(u => u.suspiciousFlag);
  const sharedFingerprints = Object.entries(fingerprints).filter(([, d]) => d.users.length > 1);

  const toggleAdmin = async (uid: string, cur: boolean) => { await set(ref(db, `users/${uid}/admin`), !cur); };
  const clearSuspicious = async (uid: string) => { await set(ref(db, `users/${uid}/suspiciousFlag`), false); };
  const deleteUser = async (uid: string) => {
    if (confirm('Удалить этого пользователя из базы данных?')) {
      await remove(ref(db, `users/${uid}`));
      await remove(ref(db, `testResults/${uid}`));
      await remove(ref(db, `messages/${uid}`));
    }
  };
  const sendReply = async (userId: string) => {
    if (!replyText.trim()) return;
    await push(ref(db, `messages/${userId}`), { from: 'admin', fromName: 'Учитель', text: replyText.trim(), timestamp: Date.now() });
    setReplyText('');
  };
  const markRead = async (id: string) => { await set(ref(db, `adminNotifications/${id}/read`), true); };

  // Test management
  const saveTest = async (t: Test) => {
    t.createdBy = currentUser!.uid;
    await set(ref(db, `tests/${t.id}`), t);
    setEditingTest(null);
  };
  const deleteTest = async (id: string) => {
    if (confirm('Удалить этот тест?')) {
      await remove(ref(db, `tests/${id}`));
      await remove(ref(db, `testSubmissions/${id}`));
    }
  };
  const togglePublish = async (id: string, cur: boolean) => {
    await set(ref(db, `tests/${id}/published`), !cur);
  };
  const gradeSubmission = async (testId: string, subId: string, grade: number) => {
    await set(ref(db, `testSubmissions/${testId}/${subId}/grade`), grade);
    await set(ref(db, `testSubmissions/${testId}/${subId}/graded`), true);
  };

  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-200)' };

  // User detail modal
  const UserDetailModal = ({ user }: { user: UserProfile }) => {
    const [uTests, setUTests] = useState<Record<string, unknown>>({});
    const [editFN, setEditFN] = useState(user.firstName);
    const [editLN, setEditLN] = useState(user.lastName);
    const [saving, setSaving] = useState(false);
    useEffect(() => { get(ref(db, `testResults/${user.uid}`)).then(s => s.exists() && setUTests(s.val())); }, [user.uid]);
    const testArr = Object.entries(uTests).map(([id, v]) => ({ id, ...(v as Record<string, unknown>) }));

    const saveUserName = async () => {
      if (!editFN.trim() || !editLN.trim()) return;
      setSaving(true);
      await set(ref(db, `users/${user.uid}/firstName`), editFN.trim());
      await set(ref(db, `users/${user.uid}/lastName`), editLN.trim());
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowUserDetail(null)}>
        <div className="rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto animate-fade-in-up"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>Профиль</h2>
            <button onClick={() => setShowUserDetail(null)} style={{ color: 'var(--text-500)' }}>✕</button>
          </div>

          {/* Editable name fields */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-600)' }}>Имя</div>
              <input value={editFN} onChange={e => setEditFN(e.target.value)}
                className="w-full text-xs font-medium bg-transparent outline-none px-2 py-1 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--text-100)' }} />
            </div>
            <div className="p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-600)' }}>Фамилия</div>
              <input value={editLN} onChange={e => setEditLN(e.target.value)}
                className="w-full text-xs font-medium bg-transparent outline-none px-2 py-1 rounded-lg"
                style={{ border: '1px solid var(--border)', color: 'var(--text-100)' }} />
            </div>
          </div>
          {(editFN !== user.firstName || editLN !== user.lastName) && (
            <button onClick={saveUserName} disabled={saving}
              className="text-[11px] px-3 py-1 rounded-lg font-medium text-white mb-3 disabled:opacity-40"
              style={{ background: 'var(--accent)' }}>
              {saving ? '...' : '✓ Сохранить имя'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { l: 'Email', v: user.email }, { l: 'UID', v: user.uid },
              { l: 'Статус', v: user.admin ? 'Админ' : 'Пользователь' },
              { l: 'Регистрация', v: new Date(user.createdAt).toLocaleDateString('ru-RU') },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>{item.l}</div>
                <div className="text-xs font-medium mt-1 break-all" style={{ color: 'var(--text-200)' }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* Suspicious score */}
          {(user.suspiciousFlag || (user.suspiciousScore && user.suspiciousScore > 0)) && (
            <div className="mb-5 p-3 rounded-xl" style={{ border: '1px solid var(--red-border)', background: 'var(--red-bg)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--red)' }}>
                  ⚠ Подозрительность: {user.suspiciousScore || 0} / {50}
                </span>
                {user.suspiciousFlag && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: '#fff', background: 'var(--red)' }}>FLAGGED</span>}
              </div>
              {user.suspiciousReasons && user.suspiciousReasons.length > 0 && (
                <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-500)' }}>
                  {user.suspiciousReasons.map((r, i) => <div key={i}>• {r}</div>)}
                </div>
              )}
            </div>
          )}

          <div className="mb-5">
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-400)' }}>Отпечатки</h3>
            {(user.linkedFingerprints || []).length > 0 ? user.linkedFingerprints?.map((fp, i) => (
              <div key={i} className="p-2 rounded-lg text-[11px] font-mono break-all mb-1"
                style={{ background: 'var(--bg-card)', color: 'var(--text-600)', border: '1px solid var(--border)' }}>{fp}</div>
            )) : <p className="text-xs" style={{ color: 'var(--text-600)' }}>Нет данных</p>}
          </div>
          <div className="mb-5">
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-400)' }}>Результаты тестов</h3>
            {testArr.length === 0 ? <p className="text-xs" style={{ color: 'var(--text-600)' }}>Нет</p> :
              testArr.map(t => (
                <div key={t.id} className="flex justify-between p-2 rounded-lg mb-1" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-200)' }}>{(t as Record<string, unknown>).testName as string}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--accent-light)' }}>{(t as Record<string, unknown>).score as number}/{(t as Record<string, unknown>).maxScore as number}</span>
                </div>
              ))
            }
          </div>
          <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => toggleAdmin(user.uid, user.admin)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: 'var(--accent-light)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              {user.admin ? 'Снять админа' : 'Сделать админом'}
            </button>
            {user.suspiciousFlag && (
              <button onClick={() => clearSuspicious(user.uid)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: 'var(--green)', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.1)' }}>Снять подозр.</button>
            )}
            <button onClick={() => { deleteUser(user.uid); setShowUserDetail(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>Удалить</button>
          </div>
        </div>
      </div>
    );
  };

  if (!userProfile?.admin) return null;

  // Preview modal
  const PreviewModal = () => {
    if (!previewTest) return null;
    const stage = previewTest.stages[previewStage];
    if (!stage) return null;
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--bg)' }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: 'var(--accent-light)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>ПРЕДПРОСМОТР</span>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-100)' }}>{previewTest.title}</h2>
          </div>
          <button onClick={() => setPreviewTest(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>✕ Закрыть</button>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Test info */}
          <div className="rounded-xl p-5 mb-6" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-100)' }}>{previewTest.title}</h1>
            {previewTest.description && <p className="text-sm" style={{ color: 'var(--text-500)' }}>{previewTest.description}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-[11px]" style={{ color: 'var(--text-600)' }}>
              <span>{previewTest.stages.length} этапов</span>
              <span>{previewTest.stages.reduce((a, s) => a + s.questions.length, 0)} вопросов</span>
              <span>{previewTest.gradingMode === 'manual' ? 'Ручная проверка' : previewTest.gradingMode === 'auto-complex' ? 'Авто (баллы)' : 'Авто (простой)'}</span>
            </div>
          </div>

          {/* Stage navigation */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {previewTest.stages.map((s, i) => (
              <button key={s.id} onClick={() => setPreviewStage(i)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={i === previewStage
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { border: '1px solid var(--border)', color: 'var(--text-500)', background: 'var(--bg-card)' }
                }>
                {s.title || `Этап ${i + 1}`}
              </button>
            ))}
          </div>

          {/* Stage content */}
          {stage.content && (
            <div className="rounded-xl p-5 mb-6 markdown-content"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(stage.content) }} />
          )}

          {/* Questions */}
          <div className="space-y-4">
            {stage.questions.map((q, qIdx) => (
              <div key={q.id} className="rounded-xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ color: 'var(--text-600)', background: 'var(--bg-card-hover)' }}>
                    {qIdx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="markdown-content text-sm" style={{ color: 'var(--text-200)' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(q.text) }} />
                    {previewTest.gradingMode === 'auto-complex' && (
                      <span className="text-[10px] mt-1 inline-block" style={{ color: 'var(--text-600)' }}>{q.points} б.</span>
                    )}
                  </div>
                </div>

                {q.type === 'choice' ? (
                  <div className="space-y-2 ml-6">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm"
                        style={{
                          border: `1px solid ${opt.correct ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
                          background: opt.correct ? 'rgba(74,222,128,0.04)' : 'var(--bg-card-hover)',
                          color: 'var(--text-200)',
                        }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: opt.correct ? 'var(--green)' : 'var(--border-hover)' }}>
                          {opt.correct && <span className="text-[8px]" style={{ color: 'var(--green)' }}>●</span>}
                        </div>
                        {opt.text}
                        {opt.correct && <span className="text-[10px] ml-auto" style={{ color: 'var(--green)' }}>✓ правильный</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ml-6">
                    <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{ ...inputStyle, opacity: 0.5 }}>
                      Текстовое поле для ответа
                    </div>
                    {q.correctAnswers && q.correctAnswers.length > 0 && q.correctAnswers[0] && (
                      <div className="mt-2 text-[11px]" style={{ color: 'var(--green)' }}>
                        Ожидаемый ответ: {q.correctAnswers.join(' / ')}
                      </div>
                    )}
                  </div>
                )}

                {q.explanation && (
                  <div className="mt-3 ml-6 text-[12px] px-3 py-2 rounded-lg" style={{ color: 'var(--text-500)', background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stage navigation bottom */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setPreviewStage(Math.max(0, previewStage - 1))} disabled={previewStage === 0}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
              style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>
              ← Назад
            </button>
            <span className="text-[12px]" style={{ color: 'var(--text-600)' }}>
              Этап {previewStage + 1} / {previewTest.stages.length}
            </span>
            <button onClick={() => setPreviewStage(Math.min(previewTest.stages.length - 1, previewStage + 1))}
              disabled={previewStage === previewTest.stages.length - 1}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-30"
              style={{ background: 'var(--accent)' }}>
              Далее →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If editing a test — show editor fullscreen
  if (editingTest !== null) {
    return (
      <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <TestEditor
            test={editingTest === 'new' ? null : editingTest}
            onSave={saveTest}
            onCancel={() => setEditingTest(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
      {showUserDetail && <UserDetailModal user={showUserDetail} />}
      <PreviewModal />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[12px] font-mono tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent-light)' }}>// Управление</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-100)' }}>Панель управления</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Пользователей', value: users.length },
            { label: 'Админов', value: users.filter(u => u.admin).length },
            { label: 'Подозрительных', value: suspiciousUsers.length },
            { label: 'Тестов', value: tests.length },
            { label: 'Уведомлений', value: notifications.filter(n => !n.read).length },
          ].map((s, i) => (
            <div key={i} className="text-center py-4 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-100)' }}>{s.value}</div>
              <div className="text-[11px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'users' as const, label: 'Пользователи' },
            { key: 'tests' as const, label: `Тесты (${tests.length})` },
            { key: 'security' as const, label: 'Безопасность' },
            { key: 'messages' as const, label: `Сообщения${notifications.filter(n => !n.read).length ? ` (${notifications.filter(n => !n.read).length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setViewSubmissions(null); }}
              className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
              style={activeTab === t.key
                ? { background: 'var(--accent)', color: '#fff' }
                : { border: '1px solid var(--border)', color: 'var(--text-500)', background: 'var(--bg-card)' }
              }>{t.label}</button>
          ))}
        </div>

        {/* ===== USERS TAB ===== */}
        {activeTab === 'users' && (
          <div className="animate-fade-in-up">
            <input type="text" placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none mb-4" style={inputStyle} />
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Пользователь', 'Email', 'ID', 'Статус', ''].map((h, i) => (
                        <th key={i} className={`text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider ${i > 1 ? 'hidden md:table-cell' : ''} ${i === 4 ? 'text-right' : ''}`}
                          style={{ color: 'var(--text-600)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.uid} className="cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                        onClick={() => setShowUserDetail(user)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ background: user.suspiciousFlag ? 'var(--red)' : 'var(--accent)' }}>
                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: 'var(--text-100)' }}>{user.firstName} {user.lastName}</div>
                              <div className="text-[11px] md:hidden" style={{ color: 'var(--text-600)' }}>{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs hidden md:table-cell" style={{ color: 'var(--text-500)' }}>{user.email}</td>
                        <td className="px-5 py-3 text-[11px] font-mono hidden md:table-cell" style={{ color: 'var(--text-600)' }}>{user.uid.substring(0, 12)}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            {user.admin && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--accent-light)', background: 'var(--accent-bg)' }}>Админ</span>}
                            {user.suspiciousFlag && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--red)', background: 'var(--red-bg)' }}>⚠</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleAdmin(user.uid, user.admin)} className="text-[11px] px-2 py-1 rounded" style={{ color: 'var(--text-600)' }}>👑</button>
                          <button onClick={() => deleteUser(user.uid)} className="text-[11px] px-2 py-1 rounded ml-1" style={{ color: 'var(--text-600)' }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && <div className="p-8 text-center text-sm" style={{ color: 'var(--text-600)' }}>Не найдено</div>}
            </div>
          </div>
        )}

        {/* ===== TESTS TAB ===== */}
        {activeTab === 'tests' && !viewSubmissions && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: 'var(--text-500)' }}>{tests.length} тестов</p>
              <button onClick={() => setEditingTest('new')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: 'var(--accent)' }}>
                + Создать тест
              </button>
            </div>

            {tests.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-200)' }}>Нет тестов</h3>
                <p className="text-[13px] mb-4" style={{ color: 'var(--text-500)' }}>Создайте ваш первый тест</p>
                <button onClick={() => setEditingTest('new')} className="text-[13px] font-medium" style={{ color: 'var(--accent-light)' }}>
                  Создать →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map(t => {
                  const subCount = submissions[t.id]?.length || 0;
                  const ungradedCount = submissions[t.id]?.filter(s => !s.graded).length || 0;
                  return (
                    <div key={t.id} className="glow-card rounded-2xl p-5 transition-all"
                      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-100)' }}>{t.title}</h3>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                              color: t.published ? 'var(--green)' : 'var(--text-600)',
                              background: t.published ? 'rgba(74,222,128,0.06)' : 'var(--bg-card-hover)',
                              border: `1px solid ${t.published ? 'rgba(74,222,128,0.15)' : 'var(--border)'}`
                            }}>
                              {t.published ? 'Опубликован' : 'Черновик'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-600)' }}>
                            <span>{t.stages?.length || 0} этапов</span>
                            <span>{t.stages?.reduce((a, s) => a + s.questions.length, 0) || 0} вопросов</span>
                            <span>{t.gradingMode === 'manual' ? 'Ручная проверка' : t.gradingMode === 'auto-complex' ? 'Авто (сложный)' : 'Авто (простой)'}</span>
                            <span>{new Date(t.createdAt).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <button onClick={() => setEditingTest(t)} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>✏️ Редактировать</button>
                        <button onClick={() => { setPreviewTest(t); setPreviewStage(0); }} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>👁 Предпросмотр</button>
                        <button onClick={() => togglePublish(t.id, t.published)} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>
                          {t.published ? '📴 Снять' : '📡 Опубликовать'}
                        </button>
                        <button onClick={() => setViewSubmissions(t.id)} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>
                          📊 Ответы ({subCount}){ungradedCount > 0 && <span style={{ color: 'var(--amber)' }}> · {ungradedCount} ✗</span>}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/test/${t.id}`); }}
                          className="text-[11px] px-2.5 py-1 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>
                          🔗 Ссылка
                        </button>
                        <button onClick={() => deleteTest(t.id)} className="text-[11px] px-2.5 py-1 rounded-lg"
                          style={{ color: 'var(--red)', border: '1px solid var(--red-border)' }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== SUBMISSIONS VIEW ===== */}
        {activeTab === 'tests' && viewSubmissions && (
          <div className="animate-fade-in-up">
            <button onClick={() => setViewSubmissions(null)} className="flex items-center gap-1 text-[13px] mb-4"
              style={{ color: 'var(--accent-light)' }}>← Назад к тестам</button>

            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-100)' }}>
              Ответы: {tests.find(t => t.id === viewSubmissions)?.title}
            </h3>

            {!(submissions[viewSubmissions]?.length) ? (
              <div className="rounded-2xl p-8 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <p className="text-sm" style={{ color: 'var(--text-500)' }}>Пока нет ответов</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Ученик', 'Класс', 'Дата', 'Баллы', 'Оценка', ''].map((h, i) => (
                          <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {submissions[viewSubmissions]?.map(sub => {
                        const test = tests.find(t => t.id === viewSubmissions);
                        return (
                          <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-200)' }}>{sub.studentName} {sub.studentLastName}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-500)' }}>{sub.studentClass}</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-600)' }}>{new Date(sub.submittedAt).toLocaleString('ru-RU')}</td>
                            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-200)' }}>
                              {sub.score !== undefined ? `${sub.score}/${sub.maxScore}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {sub.graded ? (
                                <span className="text-sm font-bold" style={{
                                  color: (sub.grade || 0) >= 4 ? 'var(--green)' : (sub.grade || 0) === 3 ? 'var(--amber)' : 'var(--red)'
                                }}>{sub.grade}</span>
                              ) : (
                                test?.gradingMode === 'manual' ? (
                                  <div className="flex gap-1">
                                    {[2, 3, 4, 5].map(g => (
                                      <button key={g} onClick={() => gradeSubmission(viewSubmissions, sub.id, g)}
                                        className="w-7 h-7 rounded-lg text-[12px] font-bold transition-all"
                                        style={{
                                          border: '1px solid var(--border)',
                                          color: g >= 4 ? 'var(--green)' : g === 3 ? 'var(--amber)' : 'var(--red)',
                                          background: 'var(--bg-card-hover)',
                                        }}>{g}</button>
                                    ))}
                                  </div>
                                ) : <span className="text-[11px]" style={{ color: 'var(--text-600)' }}>—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <details className="inline">
                                <summary className="text-[11px] cursor-pointer" style={{ color: 'var(--accent-light)' }}>Ответы</summary>
                                <div className="absolute right-4 mt-1 p-3 rounded-xl shadow-xl z-10 text-left max-w-sm max-h-60 overflow-y-auto"
                                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                  {test?.stages.map(s => s.questions.map(q => (
                                    <div key={q.id} className="text-[11px] mb-2" style={{ color: 'var(--text-400)' }}>
                                      <div className="font-medium" style={{ color: 'var(--text-200)' }}>{q.text.substring(0, 40)}</div>
                                      <div>→ {q.type === 'choice' ? q.options[Number(sub.answers[q.id])]?.text || '—' : String(sub.answers[q.id] || '—')}</div>
                                    </div>
                                  )))}
                                </div>
                              </details>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SECURITY TAB ===== */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-100)' }}>Подозрительные аккаунты</h3>
              {suspiciousUsers.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: 'var(--green)' }}>✓ Не обнаружены</div>
              ) : (
                <div className="space-y-2">
                  {suspiciousUsers.map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ border: '1px solid var(--red-border)', background: 'var(--red-bg)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--red)' }}>
                          {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}</div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-100)' }}>{u.firstName} {u.lastName}</div>
                          <div className="text-[11px]" style={{ color: 'var(--text-500)' }}>{u.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowUserDetail(u)} className="text-[11px] px-2.5 py-1 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>Подробнее</button>
                        <button onClick={() => clearSuspicious(u.uid)} className="text-[11px] px-2.5 py-1 rounded-lg" style={{ color: 'var(--green)', background: 'rgba(74,222,128,0.06)' }}>Снять</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-100)' }}>Общие устройства</h3>
              {sharedFingerprints.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: 'var(--green)' }}>✓ Все уникальны</div>
              ) : (
                <div className="space-y-2">
                  {sharedFingerprints.map(([fpHash, data]) => {
                    const linked = users.filter(u => data.users.includes(u.uid));
                    return (
                      <div key={fpHash} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                          <span className="text-[10px] font-mono break-all" style={{ color: 'var(--text-600)' }}>{fpHash.substring(0, 28)}...</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 ml-2" style={{ color: 'var(--amber)', background: 'rgba(251,191,36,0.06)' }}>{data.users.length} акк.</span>
                        </div>
                        {linked.map(u => (
                          <div key={u.uid} className="text-xs flex items-center gap-1.5 ml-2" style={{ color: 'var(--text-500)' }}>
                            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--amber)' }} />
                            {u.firstName} {u.lastName} — {u.email}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== MESSAGES TAB ===== */}
        {activeTab === 'messages' && (
          <div className="space-y-3 animate-fade-in-up">
            {notifications.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-4xl mb-3">💬</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-200)' }}>Нет сообщений</h3>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="glow-card rounded-2xl p-4 transition-all"
                  style={{ border: `1px solid ${n.read ? 'var(--border)' : 'var(--accent-border)'}`, background: n.read ? 'var(--bg-card)' : 'var(--bg-card-hover)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--accent)' }}>
                        {n.userName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-100)' }}>{n.userName}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-600)' }}>{new Date(n.timestamp).toLocaleString('ru-RU')}</div>
                      </div>
                    </div>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-[10px] px-2 py-0.5 rounded" style={{ color: 'var(--accent-light)', background: 'var(--accent-bg)' }}>
                        Прочитано
                      </button>
                    )}
                  </div>
                  <p className="text-sm ml-11 mb-3" style={{ color: 'var(--text-400)' }}>{n.text}</p>
                  {selectedUser === n.userId ? (
                    <div className="flex gap-2 ml-11">
                      <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { sendReply(n.userId); setSelectedUser(null); } }}
                        placeholder="Ответ..." className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle} autoFocus />
                      <button onClick={() => { sendReply(n.userId); setSelectedUser(null); }}
                        className="px-3 py-2 text-white text-sm rounded-lg" style={{ background: 'var(--accent)' }}>↑</button>
                      <button onClick={() => setSelectedUser(null)} className="px-2 py-2 text-sm rounded-lg" style={{ color: 'var(--text-600)' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setSelectedUser(n.userId); setReplyText(''); }}
                      className="text-[11px] ml-11" style={{ color: 'var(--accent-light)' }}>↩ Ответить</button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
