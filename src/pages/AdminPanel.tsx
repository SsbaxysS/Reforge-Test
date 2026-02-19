import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, remove, set, push, get } from 'firebase/database';
import { db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/contexts/AuthContext';

interface FingerprintData {
  users: string[];
  lastSeen: number;
}

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
    if (!currentUser || !userProfile?.admin) {
      navigate('/');
      return;
    }

    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setUsers(Object.values(data) as UserProfile[]);
      }
    });

    const fpRef = ref(db, 'fingerprints');
    const unsubFp = onValue(fpRef, (snap) => {
      if (snap.exists()) {
        setFingerprints(snap.val());
      }
    });

    const notifRef = ref(db, 'adminNotifications');
    const unsubNotif = onValue(notifRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr: AdminNotification[] = Object.entries(data).map(([id, val]) => ({
          id,
          ...(val as Omit<AdminNotification, 'id'>)
        }));
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
  const sharedFingerprints = Object.entries(fingerprints).filter(([, data]) => data.users.length > 1);

  const toggleAdmin = async (uid: string, currentStatus: boolean) => {
    await set(ref(db, `users/${uid}/admin`), !currentStatus);
  };

  const clearSuspicious = async (uid: string) => {
    await set(ref(db, `users/${uid}/suspiciousFlag`), false);
  };

  const deleteUser = async (uid: string) => {
    if (confirm('Вы уверены что хотите удалить этого пользователя из базы данных?')) {
      await remove(ref(db, `users/${uid}`));
      await remove(ref(db, `testResults/${uid}`));
      await remove(ref(db, `messages/${uid}`));
    }
  };

  const sendReply = async (userId: string) => {
    if (!replyText.trim()) return;
    const msgRef = ref(db, `messages/${userId}`);
    await push(msgRef, {
      from: 'admin',
      fromName: 'Учитель',
      text: replyText.trim(),
      timestamp: Date.now()
    });
    setReplyText('');
  };

  const markNotifRead = async (notifId: string) => {
    await set(ref(db, `adminNotifications/${notifId}/read`), true);
  };

  const getUserTestResults = async (uid: string) => {
    const snap = await get(ref(db, `testResults/${uid}`));
    return snap.exists() ? snap.val() : {};
  };

  const UserDetailModal = ({ user }: { user: UserProfile }) => {
    const [userTests, setUserTests] = useState<Record<string, unknown>>({});

    useEffect(() => {
      getUserTestResults(user.uid).then(setUserTests);
    }, [user.uid]);

    const testArr = Object.entries(userTests).map(([id, val]) => ({ id, ...(val as Record<string, unknown>) }));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowUserDetail(null)}>
        <div
          className="rounded-3xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto animate-fade-in-up"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Профиль пользователя</h2>
            <button onClick={() => setShowUserDetail(null)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Имя', value: user.firstName },
                { label: 'Фамилия', value: user.lastName },
                { label: 'Email', value: user.email },
                { label: 'UID', value: user.uid },
                { label: 'Статус', value: user.admin ? '👑 Админ' : '👤 Пользователь' },
                { label: 'Дата регистрации', value: new Date(user.createdAt).toLocaleDateString('ru-RU') },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                  <div className="text-sm font-medium mt-1 break-all" style={{ color: 'var(--text-primary)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Fingerprints */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>🔒 Отпечатки устройств</h3>
              <div className="space-y-2">
                {(user.linkedFingerprints || []).map((fp, i) => (
                  <div key={i} className="p-3 rounded-xl text-xs font-mono break-all" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    {fp}
                  </div>
                ))}
                {(!user.linkedFingerprints || user.linkedFingerprints.length === 0) && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Нет данных</p>
                )}
              </div>
            </div>

            {/* Tests */}
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>📝 Результаты тестов</h3>
              {testArr.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Тесты не найдены</p>
              ) : (
                <div className="space-y-2">
                  {testArr.map((t) => (
                    <div key={t.id} className="p-3 rounded-xl flex justify-between items-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{(t as Record<string, unknown>).testName as string}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>{(t as Record<string, unknown>).score as number}/{(t as Record<string, unknown>).maxScore as number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => toggleAdmin(user.uid, user.admin)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: user.admin ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                  color: user.admin ? '#fbbf24' : '#818cf8',
                  border: `1px solid ${user.admin ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)'}`
                }}
              >
                {user.admin ? 'Снять админа' : 'Сделать админом'}
              </button>
              {user.suspiciousFlag && (
                <button
                  onClick={() => clearSuspicious(user.uid)}
                  className="px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium transition-all hover:bg-green-500/25"
                >
                  Снять подозрение
                </button>
              )}
              <button
                onClick={() => { deleteUser(user.uid); setShowUserDetail(null); }}
                className="px-4 py-2 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium transition-all hover:bg-red-500/25"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!userProfile?.admin) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {showUserDetail && <UserDetailModal user={showUserDetail} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                boxShadow: '0 8px 25px rgba(245,158,11,0.25)'
              }}
            >⚙️</span>
            Панель управления
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Управление платформой Reforge Test</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Пользователей', value: users.length, icon: '👥', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
            { label: 'Админов', value: users.filter(u => u.admin).length, icon: '👑', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
            { label: 'Подозрительных', value: suspiciousUsers.length, icon: '⚠️', gradient: 'linear-gradient(135deg, #ef4444, #ec4899)' },
            { label: 'Уведомлений', value: notifications.filter(n => !n.read).length, icon: '🔔', gradient: 'linear-gradient(135deg, #22c55e, #10b981)' },
          ].map((s, i) => (
            <div key={i} className="p-5 rounded-2xl glass">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{s.icon}</span>
                <span
                  className="text-2xl font-black"
                  style={{
                    background: s.gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >{s.value}</span>
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([
            { key: 'users' as const, label: '👥 Пользователи' },
            { key: 'security' as const, label: '🛡️ Безопасность' },
            { key: 'messages' as const, label: `💬 Сообщения ${notifications.filter(n => !n.read).length > 0 ? `(${notifications.filter(n => !n.read).length})` : ''}` },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300"
              style={activeTab === tab.key ? {
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'white',
                boxShadow: '0 4px 15px var(--accent-glow)'
              } : {
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="animate-fade-in-up">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск по имени, email или ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl transition-all outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div className="glass rounded-3xl overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Пользователь</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Email</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>ID</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Статус</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr
                        key={user.uid}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                        onClick={() => setShowUserDetail(user)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                              style={{
                                background: user.suspiciousFlag
                                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                  : user.admin
                                    ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                                    : 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                              }}
                            >
                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</div>
                              <div className="text-xs sm:hidden" style={{ color: 'var(--text-muted)' }}>{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                        <td className="px-6 py-4 text-xs font-mono hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>{user.uid.substring(0, 12)}...</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.admin && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-md">Админ</span>}
                            {user.suspiciousFlag && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-md">⚠️</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => toggleAdmin(user.uid, user.admin)}
                              className="p-2 rounded-lg transition-all hover:bg-amber-500/10"
                              style={{ color: 'var(--text-muted)' }}
                              title={user.admin ? 'Снять админа' : 'Сделать админом'}
                            >
                              👑
                            </button>
                            <button
                              onClick={() => deleteUser(user.uid)}
                              className="p-2 rounded-lg transition-all hover:bg-red-500/10 text-red-400/50 hover:text-red-400"
                              title="Удалить"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Пользователи не найдены</div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Suspicious */}
            <div className="glass rounded-3xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="text-red-400">⚠️</span> Подозрительные пользователи
              </h3>
              {suspiciousUsers.length === 0 ? (
                <div className="p-8 text-center text-green-400/70">
                  <div className="text-4xl mb-2">✅</div>
                  Подозрительные аккаунты не обнаружены
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousUsers.map(user => (
                    <div key={user.uid} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-red-400/60">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowUserDetail(user)} className="px-3 py-1.5 text-xs rounded-lg transition glass" style={{ color: 'var(--text-secondary)' }}>
                          Подробнее
                        </button>
                        <button onClick={() => clearSuspicious(user.uid)} className="px-3 py-1.5 bg-green-500/15 text-green-400 text-xs rounded-lg hover:bg-green-500/25 transition">
                          Снять
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Fingerprints */}
            <div className="glass rounded-3xl p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="text-amber-400">🔍</span> Общие устройства (несколько аккаунтов)
              </h3>
              {sharedFingerprints.length === 0 ? (
                <div className="p-8 text-center text-green-400/70">
                  <div className="text-4xl mb-2">✅</div>
                  Все устройства уникальны
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedFingerprints.map(([fpHash, data]) => {
                    const linkedUsers = users.filter(u => data.users.includes(u.uid));
                    return (
                      <div key={fpHash} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{fpHash.substring(0, 32)}...</div>
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-md shrink-0 ml-2">{data.users.length} аккаунтов</span>
                        </div>
                        <div className="space-y-1">
                          {linkedUsers.map(u => (
                            <div key={u.uid} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                              {u.firstName} {u.lastName} — {u.email}
                            </div>
                          ))}
                          {data.users.filter(uid => !linkedUsers.find(u => u.uid === uid)).map(uid => (
                            <div key={uid} className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--text-muted)' }} />
                              UID: {uid} (удалён)
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4 animate-fade-in-up">
            {notifications.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Нет сообщений</h3>
                <p style={{ color: 'var(--text-muted)' }}>Пользователи еще не отправляли сообщений</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  className="glass rounded-2xl p-5 transition-all"
                  style={{
                    boxShadow: 'var(--shadow-card)',
                    borderColor: notif.read ? 'var(--border-color)' : 'var(--accent-primary)',
                    background: notif.read ? 'var(--bg-card)' : 'var(--bg-card-hover)'
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                      >
                        {notif.userName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{notif.userName}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(notif.timestamp).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    {!notif.read && (
                      <button onClick={() => markNotifRead(notif.id)} className="px-3 py-1 text-xs rounded-lg transition" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>
                        Прочитано
                      </button>
                    )}
                  </div>
                  <p className="text-sm mb-4 pl-[52px]" style={{ color: 'var(--text-secondary)' }}>{notif.text}</p>

                  {/* Reply */}
                  {selectedUser === notif.userId ? (
                    <div className="flex gap-2 pl-[52px]">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { sendReply(notif.userId); setSelectedUser(null); } }}
                        placeholder="Ответ учителя..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        autoFocus
                      />
                      <button
                        onClick={() => { sendReply(notif.userId); setSelectedUser(null); }}
                        className="px-4 py-2 text-white text-sm rounded-lg"
                        style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                      >
                        Отправить
                      </button>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="px-3 py-2 text-sm rounded-lg"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSelectedUser(notif.userId); setReplyText(''); }}
                      className="text-xs transition pl-[52px]"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      ↩️ Ответить
                    </button>
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
