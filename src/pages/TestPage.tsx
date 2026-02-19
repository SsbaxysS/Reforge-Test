import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, get, push } from 'firebase/database';
import { db } from '@/firebase';
import type { Test, TestSubmission } from '@/types/test';
import { calcGrade } from '@/types/test';
import { renderMarkdown } from '@/utils/markdown';

type Phase = 'intro' | 'test' | 'result';

export default function TestPage() {
    const { testId } = useParams<{ testId: string }>();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Student info
    const [studentName, setStudentName] = useState('');
    const [studentLastName, setStudentLastName] = useState('');
    const [studentClass, setStudentClass] = useState('');

    // Test state
    const [phase, setPhase] = useState<Phase>('intro');
    const [currentStage, setCurrentStage] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; maxScore: number; grade: number } | null>(null);

    // Load test
    useEffect(() => {
        if (!testId) return;
        get(ref(db, `tests/${testId}`)).then(snap => {
            if (snap.exists()) {
                const t = snap.val() as Test;
                if (!t.published) { setError('Тест не опубликован'); }
                else { setTest(t); }
            } else { setError('Тест не найден'); }
            setLoading(false);
        }).catch(() => { setError('Ошибка загрузки'); setLoading(false); });
    }, [testId]);

    const startTest = () => {
        if (!studentName.trim() || !studentLastName.trim() || !studentClass.trim()) { setError('Заполните все поля'); return; }
        setError('');
        setPhase('test');
    };

    const setAnswer = (questionId: string, value: string | number) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const allAnswered = () => {
        if (!test) return false;
        for (const stage of test.stages) {
            for (const q of stage.questions) {
                const a = answers[q.id];
                if (a === undefined || a === '') return false;
            }
        }
        return true;
    };

    const unansweredStages = () => {
        if (!test) return [];
        return test.stages.map((s, i) => ({
            index: i,
            unanswered: s.questions.filter(q => answers[q.id] === undefined || answers[q.id] === '').length
        })).filter(s => s.unanswered > 0);
    };

    const submitTest = async () => {
        if (!test || !allAnswered()) return;
        setSubmitting(true);

        let score = 0;
        let maxScore = 0;

        if (test.gradingMode !== 'manual') {
            for (const stage of test.stages) {
                for (const q of stage.questions) {
                    const pts = test.gradingMode === 'auto-complex' ? q.points : 1;
                    maxScore += pts;
                    const ans = answers[q.id];
                    if (q.type === 'choice') {
                        const correctIdx = q.options.findIndex(o => o.correct);
                        if (ans === correctIdx) score += pts;
                    } else {
                        const correct = q.correctAnswers[0]?.trim().toLowerCase();
                        if (correct && String(ans).trim().toLowerCase() === correct) score += pts;
                    }
                }
            }
        } else {
            maxScore = test.stages.reduce((a, s) => a + s.questions.length, 0);
        }

        const grade = test.gradingMode === 'manual' ? 0 : calcGrade(score, maxScore);

        const submission: Omit<TestSubmission, 'id'> = {
            testId: test.id,
            studentName: studentName.trim(),
            studentLastName: studentLastName.trim(),
            studentClass: studentClass.trim(),
            fingerprint: '',
            submittedAt: Date.now(),
            answers,
            score: test.gradingMode !== 'manual' ? score : undefined,
            maxScore,
            graded: test.gradingMode !== 'manual',
            grade: test.gradingMode !== 'manual' ? grade : undefined,
        };

        try {
            await push(ref(db, `testSubmissions/${test.id}`), submission);
            setResult({ score, maxScore, grade });
            setPhase('result');
        } catch {
            setError('Ошибка отправки');
        }
        setSubmitting(false);
    };

    const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-200)' };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        </div>
    );

    if (error && !test) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
            <div className="text-center">
                <div className="text-4xl mb-4">😕</div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-500)' }}>{error}</p>
                <Link to="/" className="text-[13px]" style={{ color: 'var(--accent-light)' }}>← На главную</Link>
            </div>
        </div>
    );

    if (!test) return null;

    // ========= INTRO =========
    if (phase === 'intro') return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-md">
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <div className="p-8">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold mb-5" style={{ background: 'var(--accent)' }}>📝</div>
                        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-100)' }}>{test.title}</h1>
                        {test.description && <p className="text-sm mb-6" style={{ color: 'var(--text-500)' }}>{test.description}</p>}

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="text-center py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                                <div className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>{test.stages.length}</div>
                                <div className="text-[10px] uppercase" style={{ color: 'var(--text-600)' }}>Этапов</div>
                            </div>
                            <div className="text-center py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                                <div className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>{test.stages.reduce((a, s) => a + s.questions.length, 0)}</div>
                                <div className="text-[10px] uppercase" style={{ color: 'var(--text-600)' }}>Вопросов</div>
                            </div>
                            <div className="text-center py-2 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                                <div className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>
                                    {test.gradingMode === 'manual' ? '✍️' : test.gradingMode === 'auto-complex' ? '⚖️' : '⚡'}
                                </div>
                                <div className="text-[10px] uppercase" style={{ color: 'var(--text-600)' }}>
                                    {test.gradingMode === 'manual' ? 'Ручная' : 'Авто'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-500)' }}>Имя</label>
                                <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Иван"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
                            </div>
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-500)' }}>Фамилия</label>
                                <input type="text" value={studentLastName} onChange={e => setStudentLastName(e.target.value)} placeholder="Иванов"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
                            </div>
                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-500)' }}>Класс</label>
                                <input type="text" value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="9А"
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none" style={inputStyle} />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm rounded-xl px-3.5 py-2.5 mb-4" style={{ color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>
                                {error}
                            </div>
                        )}

                        <button onClick={startTest} className="w-full py-3 rounded-xl text-white font-medium text-sm"
                            style={{ background: 'var(--accent)' }}>
                            Начать тест
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ========= TEST =========
    if (phase === 'test') {
        const stage = test.stages[currentStage];
        const unans = unansweredStages();

        return (
            <div className="min-h-screen pt-6 pb-20 px-6" style={{ background: 'var(--bg)' }}>
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <h1 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>{test.title}</h1>
                            <p className="text-[12px]" style={{ color: 'var(--text-600)' }}>{studentName} {studentLastName} · {studentClass}</p>
                        </div>
                        <div className="text-right text-[12px]" style={{ color: 'var(--text-600)' }}>
                            Этап {currentStage + 1} / {test.stages.length}
                        </div>
                    </div>

                    {/* Stage navigation */}
                    <div className="flex flex-wrap gap-1.5 mb-6">
                        {test.stages.map((s, i) => {
                            const stageUnanswered = s.questions.some(q => answers[q.id] === undefined || answers[q.id] === '');
                            const isCurrent = i === currentStage;
                            return (
                                <button key={s.id} onClick={() => setCurrentStage(i)}
                                    className="w-8 h-8 rounded-lg text-[12px] font-medium transition-all"
                                    style={isCurrent
                                        ? { background: 'var(--accent)', color: '#fff' }
                                        : stageUnanswered
                                            ? { border: '1px solid var(--border)', color: 'var(--text-600)', background: 'var(--bg-card)' }
                                            : { border: '1px solid var(--green)', color: 'var(--green)', background: 'rgba(74,222,128,0.06)' }
                                    }>
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    {/* Stage content */}
                    {stage.content && (
                        <div className="rounded-xl p-5 mb-6 markdown-content"
                            style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(stage.content) }} />
                    )}

                    {/* Questions */}
                    <div className="space-y-4 mb-8">
                        {stage.questions.map((q, qIdx) => (
                            <div key={q.id} className="rounded-xl p-5" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                <div className="flex items-start gap-3 mb-4">
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                                        style={{ color: 'var(--text-600)', background: 'var(--bg-card-hover)' }}>
                                        {qIdx + 1}
                                    </span>
                                    <div className="markdown-content text-sm" style={{ color: 'var(--text-200)' }}
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(q.text) }} />
                                </div>

                                {q.type === 'choice' ? (
                                    <div className="space-y-2 ml-3 sm:ml-6">
                                        {q.options.map((opt, oIdx) => (
                                            <button key={oIdx} onClick={() => setAnswer(q.id, oIdx)}
                                                className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm"
                                                style={{
                                                    border: `1px solid ${answers[q.id] === oIdx ? 'var(--accent-border)' : 'var(--border)'}`,
                                                    background: answers[q.id] === oIdx ? 'var(--accent-bg)' : 'var(--bg-card-hover)',
                                                    color: 'var(--text-200)',
                                                }}>
                                                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                                                    style={{
                                                        borderColor: answers[q.id] === oIdx ? 'var(--accent)' : 'var(--border-hover)',
                                                        background: answers[q.id] === oIdx ? 'var(--accent)' : 'transparent',
                                                    }}>
                                                    {answers[q.id] === oIdx && <span className="text-white text-[8px]">●</span>}
                                                </div>
                                                {opt.text}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="ml-3 sm:ml-6">
                                        <textarea value={String(answers[q.id] || '')} onChange={e => setAnswer(q.id, e.target.value)}
                                            placeholder="Введите ответ..."
                                            className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none resize-y min-h-[60px]" style={inputStyle} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <button onClick={() => setCurrentStage(Math.max(0, currentStage - 1))} disabled={currentStage === 0}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-400)' }}>
                            ← Назад
                        </button>

                        <div className="text-center">
                            {error && <div className="text-[12px] mb-1" style={{ color: 'var(--red)' }}>{error}</div>}
                        </div>

                        {currentStage === test.stages.length - 1 ? (
                            <button onClick={() => {
                                if (!allAnswered()) {
                                    const unList = unans.map(u => `Этап ${u.index + 1}`).join(', ');
                                    setError(`Ответьте на все вопросы: ${unList}`);
                                    return;
                                }
                                setError('');
                                submitTest();
                            }}
                                disabled={submitting}
                                className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
                                style={{ background: allAnswered() ? 'var(--accent)' : 'var(--text-700)' }}>
                                {submitting ? 'Отправка...' : 'Завершить тест'}
                            </button>
                        ) : (
                            <button onClick={() => setCurrentStage(currentStage + 1)}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                                style={{ background: 'var(--accent)' }}>
                                Далее →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ========= RESULT =========
    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: 'var(--bg)' }}>
            <div className="w-full max-w-md">
                <div className="rounded-2xl overflow-hidden text-center" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <div className="p-8">
                        {test.gradingMode === 'manual' ? (
                            <>
                                <div className="text-5xl mb-4">📋</div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-100)' }}>Тест отправлен</h2>
                                <p className="text-sm mb-6" style={{ color: 'var(--text-500)' }}>
                                    Учитель проверит ваши ответы и выставит оценку
                                </p>
                            </>
                        ) : result && (
                            <>
                                <div className="text-6xl mb-4">
                                    {result.grade === 5 ? '🏆' : result.grade === 4 ? '🎯' : result.grade === 3 ? '📝' : '📚'}
                                </div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-100)' }}>Тест завершён</h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                    <div className="py-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                                        <div className="text-2xl font-bold" style={{ color: 'var(--text-100)' }}>{result.score}/{result.maxScore}</div>
                                        <div className="text-[10px] uppercase" style={{ color: 'var(--text-600)' }}>Баллы</div>
                                    </div>
                                    <div className="py-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                                        <div className="text-2xl font-bold" style={{ color: 'var(--text-100)' }}>
                                            {Math.round((result.score / result.maxScore) * 100)}%
                                        </div>
                                        <div className="text-[10px] uppercase" style={{ color: 'var(--text-600)' }}>Результат</div>
                                    </div>
                                    <div className="py-3 rounded-xl" style={{
                                        border: `1px solid ${result.grade >= 4 ? 'rgba(74,222,128,0.2)' : result.grade === 3 ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)'}`,
                                        background: result.grade >= 4 ? 'rgba(74,222,128,0.06)' : result.grade === 3 ? 'rgba(251,191,36,0.06)' : 'rgba(248,113,113,0.06)',
                                    }}>
                                        <div className="text-2xl font-bold" style={{
                                            color: result.grade >= 4 ? 'var(--green)' : result.grade === 3 ? 'var(--amber)' : 'var(--red)'
                                        }}>{result.grade}</div>
                                        <div className="text-[10px] uppercase" style={{ color: 'var(--text-600)' }}>Оценка</div>
                                    </div>
                                </div>

                                {/* Show correct answers */}
                                <div className="text-left space-y-3 mt-4">
                                    {test.stages.map(stage =>
                                        stage.questions.map(q => {
                                            const ans = answers[q.id];
                                            let isCorrect = false;
                                            if (q.type === 'choice') {
                                                isCorrect = q.options.findIndex(o => o.correct) === ans;
                                            } else {
                                                const correct = q.correctAnswers[0]?.trim().toLowerCase();
                                                isCorrect = !!correct && String(ans).trim().toLowerCase() === correct;
                                            }
                                            return (
                                                <div key={q.id} className="rounded-lg p-3 text-[13px]"
                                                    style={{ border: `1px solid ${isCorrect ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`, background: isCorrect ? 'rgba(74,222,128,0.03)' : 'rgba(248,113,113,0.03)' }}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span>{isCorrect ? '✅' : '❌'}</span>
                                                        <span style={{ color: 'var(--text-200)' }}>{q.text.substring(0, 60)}{q.text.length > 60 ? '...' : ''}</span>
                                                    </div>
                                                    {q.type === 'choice' && !isCorrect && (
                                                        <p className="text-[11px] ml-6" style={{ color: 'var(--green)' }}>
                                                            Правильно: {q.options.find(o => o.correct)?.text}
                                                        </p>
                                                    )}
                                                    {q.explanation && (
                                                        <p className="text-[11px] ml-6 mt-1" style={{ color: 'var(--text-500)' }}>💡 {q.explanation}</p>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}

                        <Link to="/" className="inline-block mt-6 text-[13px]" style={{ color: 'var(--accent-light)' }}>
                            ← На главную
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
