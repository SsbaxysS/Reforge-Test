import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, remove, set, push, get } from 'firebase/database';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/contexts/AuthContext';

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
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'messages'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showUserDetail, setShowUserDetail] = useState<UserProfile | null>(null);

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
    return () => { unsubUsers(); unsubFp(); unsubNotif(); };
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

  const UserDetailModal = ({ user }: { user: UserProfile }) => {
    const [tests, setTests] = useState<Record<string, unknown>>({});
    useEffect(() => { get(ref(db, `testResults/${user.uid}`)).then(s => s.exists() && setTests(s.val())); }, [user.uid]);
    const testArr = Object.entries(tests).map(([id, v]) => ({ id, ...(v as Record<string, unknown>) }));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowUserDetail(null)}>
        <div className="rounded-2xl p-6 max-w-xl w-full max-h-[85vh] overflow-y-auto animate-fade-in-up"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>Профиль</h2>
            <button onClick={() => setShowUserDetail(null)} style={{ color: 'var(--text-500)' }}>✕</button>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { l: 'Имя', v: user.firstName },
              { l: 'Фамилия', v: user.lastName },
              { l: 'Email', v: user.email },
              { l: 'UID', v: user.uid },
              { l: 'Статус', v: user.admin ? 'Админ' : 'Пользователь' },
              { l: 'Регистрация', v: new Date(user.createdAt).toLocaleDateString('ru-RU') },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>{item.l}</div>
                <div className="text-xs font-medium mt-1 break-all" style={{ color: 'var(--text-200)' }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* Fingerprints */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-400)' }}>Отпечатки устройств</h3>
            {(user.linkedFingerprints || []).length > 0 ? user.linkedFingerprints?.map((fp, i) => (
              <div key={i} className="p-2 rounded-lg text-[11px] font-mono break-all mb-1"
                style={{ background: 'var(--bg-card)', color: 'var(--text-600)', border: '1px solid var(--border)' }}>{fp}</div>
            )) : <p className="text-xs" style={{ color: 'var(--text-600)' }}>Нет данных</p>}
          </div>

          {/* Tests */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-400)' }}>Результаты тестов</h3>
            {testArr.length === 0 ? <p className="text-xs" style={{ color: 'var(--text-600)' }}>Нет тестов</p> :
              testArr.map(t => (
                <div key={t.id} className="flex justify-between p-2 rounded-lg mb-1" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-200)' }}>{(t as Record<string, unknown>).testName as string}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--accent-light)' }}>{(t as Record<string, unknown>).score as number}/{(t as Record<string, unknown>).maxScore as number}</span>
                </div>
              ))
            }
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => toggleAdmin(user.uid, user.admin)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: 'var(--accent-light)', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
              {user.admin ? 'Снять админа' : 'Сделать админом'}
            </button>
            {user.suspiciousFlag && (
              <button onClick={() => clearSuspicious(user.uid)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: 'var(--green)', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.1)' }}>
                Снять подозр.
              </button>
            )}
            <button onClick={() => { deleteUser(user.uid); setShowUserDetail(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>
              Удалить
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!userProfile?.admin) return null;

  return (
    <div className="min-h-screen pt-20" style={{ background: 'var(--bg)' }}>
      {showUserDetail && <UserDetailModal user={showUserDetail} />}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[12px] font-mono tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent-light)' }}>
            // Управление
          </p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-100)' }}>Панель управления</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Пользователей', value: users.length },
            { label: 'Админов', value: users.filter(u => u.admin).length },
            { label: 'Подозрительных', value: suspiciousUsers.length },
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
            { key: 'security' as const, label: 'Безопасность' },
            { key: 'messages' as const, label: `Сообщения${notifications.filter(n => !n.read).length ? ` (${notifications.filter(n => !n.read).length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
              style={activeTab === t.key
                ? { background: 'var(--accent)', color: '#fff' }
                : { border: '1px solid var(--border)', color: 'var(--text-500)', background: 'var(--bg-card)' }
              }>
              {t.label}
            </button>
          ))}
        </div>

        {/* Users */}
        {activeTab === 'users' && (
          <div className="animate-fade-in-up">
            <input
              type="text" placeholder="Поиск по имени, email или ID..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none mb-4 transition-colors"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-200)' }}
            />

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
                      <tr key={user.uid} className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border)' }}
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
                          <button onClick={() => toggleAdmin(user.uid, user.admin)} className="text-[11px] px-2 py-1 rounded transition-colors" style={{ color: 'var(--text-600)' }}>👑</button>
                          <button onClick={() => deleteUser(user.uid)} className="text-[11px] px-2 py-1 rounded transition-colors ml-1" style={{ color: 'var(--text-600)' }}>🗑</button>
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

        {/* Security */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Suspicious */}
            <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-100)' }}>Подозрительные аккаунты</h3>
              {suspiciousUsers.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: 'var(--green)' }}>✓ Подозрительные не обнаружены</div>
              ) : (
                <div className="space-y-2">
                  {suspiciousUsers.map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ border: '1px solid var(--red-border)', background: 'var(--red-bg)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--red)' }}>
                          {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                        </div>
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

            {/* Shared Fingerprints */}
            <div className="rounded-2xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-100)' }}>Общие устройства</h3>
              {sharedFingerprints.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: 'var(--green)' }}>✓ Все устройства уникальны</div>
              ) : (
                <div className="space-y-2">
                  {sharedFingerprints.map(([fpHash, data]) => {
                    const linked = users.filter(u => data.users.includes(u.uid));
                    return (
                      <div key={fpHash} className="p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                        <div className="flex items-center justify-between mb-2">
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

        {/* Messages */}
        {activeTab === 'messages' && (
          <div className="space-y-3 animate-fade-in-up">
            {notifications.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="text-4xl mb-3">💬</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-200)' }}>Нет сообщений</h3>
                <p className="text-[13px]" style={{ color: 'var(--text-500)' }}>Пользователи еще не писали</p>
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
                        placeholder="Ответ..." className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-200)' }} autoFocus />
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
