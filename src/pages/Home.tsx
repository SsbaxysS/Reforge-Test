import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated bg orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[100px] animate-float"
            style={{ background: 'var(--accent-glow)', opacity: 0.6 }}
          />
          <div
            className="absolute top-60 -left-40 w-[400px] h-[400px] rounded-full blur-[100px] animate-float"
            style={{ background: 'var(--accent-glow)', opacity: 0.4, animationDelay: '2s' }}
          />
          <div
            className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full blur-[100px] animate-float"
            style={{ background: 'var(--accent-glow)', opacity: 0.3, animationDelay: '4s' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <div className="text-center">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium mb-10 animate-fade-in-up glass"
              style={{ color: 'var(--accent-primary)' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
              Платформа для школьного тестирования
            </div>

            {/* Title */}
            <h1
              className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.1] mb-6 animate-fade-in-up delay-100"
              style={{
                background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-primary) 50%, var(--accent-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Reforge Test
            </h1>

            <p className="text-xl sm:text-2xl max-w-3xl mx-auto mb-4 animate-fade-in-up delay-200 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Современная платформа для проведения тестов и экзаменов
            </p>
            <p className="text-lg max-w-2xl mx-auto mb-14 animate-fade-in-up delay-300" style={{ color: 'var(--text-muted)' }}>
              Мгновенные результаты, удобная связь с учителями и полная аналитика успеваемости
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-400">
              {currentUser ? (
                <Link
                  to="/profile"
                  className="group px-8 py-4 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    boxShadow: '0 8px 30px var(--accent-glow)'
                  }}
                >
                  Перейти в профиль
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group px-8 py-4 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      boxShadow: '0 8px 30px var(--accent-glow)'
                    }}
                  >
                    Начать бесплатно
                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 font-semibold text-lg rounded-2xl transition-all duration-300 glass hover:scale-105"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Уже есть аккаунт
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stat badges */}
          <div className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {[
              { icon: '⚡', label: 'Мгновенные результаты' },
              { icon: '📊', label: 'Подробная аналитика' },
              { icon: '💬', label: 'Чат с учителем' },
              { icon: '🎯', label: 'Точная проверка' },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center p-6 rounded-2xl glass transition-all duration-500 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${0.5 + i * 0.1}s` }}
              >
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>
              Возможности платформы
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Всё что нужно для эффективного обучения</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                ),
                title: 'Тесты и экзамены',
                desc: 'Создавайте тесты с различными типами вопросов, ограничением времени и автоматической проверкой',
                gradient: 'linear-gradient(135deg, #6366f1, #3b82f6)'
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
                title: 'Профиль ученика',
                desc: 'Полная история тестов, статистика успеваемости и персональный прогресс обучения',
                gradient: 'linear-gradient(135deg, #a855f7, #ec4899)'
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: 'Связь с учителем',
                desc: 'Встроенный чат для обсуждения результатов тестов и получения обратной связи от преподавателя',
                gradient: 'linear-gradient(135deg, #22c55e, #10b981)'
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Аналитика результатов',
                desc: 'Подробная статистика по каждому тесту с визуализацией и трендами успеваемости',
                gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)'
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Быстрая регистрация',
                desc: 'Вход через email или Google аккаунт за несколько секунд — никаких сложностей',
                gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)'
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Безопасность',
                desc: 'Надёжная аутентификация через Firebase, защита данных и безопасность аккаунтов',
                gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 rounded-3xl glass transition-all duration-500 hover:-translate-y-2"
                style={{ ['--shadow-card' as string]: '0 20px 60px var(--accent-glow)' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: feature.gradient, boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
                <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-24" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>
              Как это работает
            </h2>
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>Простой путь от регистрации до результата</p>
          </div>

          <div className="space-y-6">
            {[
              { step: '01', title: 'Регистрация', desc: 'Создайте аккаунт с помощью email или Google за несколько секунд' },
              { step: '02', title: 'Прохождение теста', desc: 'Выберите доступный тест и пройдите его в удобном интерфейсе' },
              { step: '03', title: 'Мгновенный результат', desc: 'Узнайте свой балл и разбор ошибок сразу после завершения' },
              { step: '04', title: 'Обратная связь', desc: 'Обсудите результаты с учителем через встроенный мессенджер' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start group">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-lg group-hover:scale-110 transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    boxShadow: '0 8px 25px var(--accent-glow)'
                  }}
                >
                  {item.step}
                </div>
                <div className="pt-2 flex-1">
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)' }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>© 2025 Reforge Test. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
