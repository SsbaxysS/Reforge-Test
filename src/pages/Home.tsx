import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, Variants } from 'framer-motion';

const containerVars: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVars: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Home() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Hero */}
      <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />

        {/* Content */}
        <motion.div
          variants={containerVars} initial="hidden" animate="show"
          className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center pt-20 sm:pt-14"
        >
          {/* Badge */}
          <motion.div variants={itemVars}
            className="inline-flex items-center gap-2 text-xs px-4 py-1.5 rounded-full mb-8"
            style={{ color: 'var(--text-400)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            Платформа тестирования
          </motion.div>

          {/* Title */}
          <motion.h1 variants={itemVars}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
            style={{ color: 'var(--text-100)' }}
          >
            Reforge Test
          </motion.h1>

          <motion.p variants={itemVars} className="text-lg max-w-xl mx-auto mb-4 leading-relaxed font-light" style={{ color: 'var(--text-500)' }}>
            Современная платформа для проведения тестов и экзаменов в школе
          </motion.p>

          <motion.p variants={itemVars} className="text-[15px] max-w-md mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-600)' }}>
            Мгновенные результаты, удобная связь с учителями и полная аналитика успеваемости
          </motion.p>

          {/* CTA */}
          <motion.div variants={itemVars} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentUser ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-white px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
              >
                Перейти в профиль
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto text-white px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                  style={{ background: 'var(--accent)', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
                >
                  Начать бесплатно
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-medium text-sm transition-all hover:bg-neutral-500/10 active:scale-95"
                  style={{ color: 'var(--text-200)', border: '1px solid var(--border)' }}
                >
                  Войти
                </Link>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--bg)] to-transparent" />
      </section>

      {/* Features */}
      <section className="relative py-28 z-[1]">
        <div className="section-divider max-w-6xl mx-auto mb-28" />

        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
          >
            <div>
              <p className="text-[12px] font-mono tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--accent-light)' }}>
                // Возможности
              </p>
              <h2 className="font-bold text-3xl md:text-4xl tracking-tight leading-tight" style={{ color: 'var(--text-100)' }}>
                Всё необходимое.<br />
                <span style={{ color: 'var(--text-600)' }}>Ничего лишнего.</span>
              </h2>
            </div>
            <p className="text-[14px] max-w-sm leading-relaxed" style={{ color: 'var(--text-500)' }}>
              Каждая функция создана для удобного и честного тестирования учеников.
            </p>
          </motion.div>

          {/* Grid */}
          <motion.div
            variants={containerVars} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: '◎', title: 'Тесты и экзамены', desc: 'Автоматическая проверка результатов.', tags: ['Автопроверка', 'Таймер'] },
              { icon: '◈', title: 'Профиль ученика', desc: 'Следите за статистикой успеваемости.', tags: ['История', 'Прогресс'] },
              { icon: '⟐', title: 'Связь с учителем', desc: 'Обсуждение результатов тестирования.', tags: ['Уведомления', 'Чат'] },
              { icon: '⬡', title: 'Аналитика', desc: 'Подробная статистика по каждому тесту.', tags: ['Графики', 'Тренды'] },
              { icon: '⊞', title: 'Быстрый старт', desc: 'Поддержка Google Auth.', tags: ['Email', 'Google'] },
              { icon: '⊘', title: 'Безопасность', desc: 'Надежная защита аккаунтов.', tags: ['Шифрование', 'Firebase'] },
            ].map((f, i) => (
              <motion.div variants={itemVars} key={i}>
                <div
                  className="glow-card group relative h-full p-7 rounded-2xl transition-all duration-500"
                  style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-card-hover)';
                    e.currentTarget.style.borderColor = 'var(--accent-border)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.06), transparent 70%)' }} />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl transition-colors duration-500" style={{ color: 'var(--text-700)' }}>{f.icon}</span>
                      <h3 className="font-semibold text-[16px]" style={{ color: 'var(--text-100)' }}>{f.title}</h3>
                    </div>
                    <p className="text-[13px] leading-relaxed mb-5 group-hover:text-[var(--text-400)] transition-colors duration-500" style={{ color: 'var(--text-500)' }}>{f.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ color: 'var(--text-700)', border: '1px solid var(--border)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-28">
        <div className="section-divider max-w-6xl mx-auto mb-28" />

        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} className="mb-16">
            <p className="text-[12px] font-mono tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--accent-light)' }}>// Процесс</p>
            <h2 className="font-bold text-3xl md:text-4xl tracking-tight" style={{ color: 'var(--text-100)' }}>Как это работает</h2>
          </motion.div>

          <motion.div variants={containerVars} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="space-y-4">
            {[
              { step: '01', title: 'Регистрация', desc: 'Авторизуйтесь через почту или Google' },
              { step: '02', title: 'Прохождение', desc: 'Решите предложенные учителем тесты' },
              { step: '03', title: 'Результат', desc: 'Получите мгновенную оценку системы' },
            ].map((item, i) => (
              <motion.div variants={itemVars} key={i}>
                <div
                  className="flex gap-4 sm:gap-6 items-start group p-4 sm:p-5 rounded-2xl transition-all duration-300"
                  style={{ border: '1px solid transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold transition-transform group-hover:scale-105" style={{ background: 'var(--accent)' }}>
                    {item.step}
                  </div>
                  <div className="pt-1 flex-1">
                    <h3 className="font-semibold text-[16px] mb-1" style={{ color: 'var(--text-100)' }}>{item.title}</h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-500)' }}>{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 mt-10" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-nav)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ background: 'var(--accent)' }}>R</div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-400)' }}>© 2025 Reforge Test</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
