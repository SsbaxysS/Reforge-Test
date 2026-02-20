import { useState, useRef, useCallback, useEffect } from 'react';
import type { Test, TestStage, TestQuestion, GradingMode } from '@/types/test';
import { generateId, createEmptyQuestion, createEmptyStage } from '@/types/test';
import { renderMarkdown } from '@/utils/markdown';
import toast from 'react-hot-toast';

// ========= Image compression =========
async function compressImage(file: File, maxW = 1200, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxW) { h = (h * maxW) / w; w = maxW; }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject('No canvas'); return; }
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========= Toolbar actions =========
type FormatAction = { prefix: string; suffix: string; placeholder: string };

const FORMATS: Record<string, FormatAction> = {
    bold: { prefix: '**', suffix: '**', placeholder: 'жирный текст' },
    italic: { prefix: '*', suffix: '*', placeholder: 'курсив' },
    bolditalic: { prefix: '***', suffix: '***', placeholder: 'жирный курсив' },
    strike: { prefix: '~~', suffix: '~~', placeholder: 'зачёркнутый' },
    code: { prefix: '`', suffix: '`', placeholder: 'код' },
    link: { prefix: '[', suffix: '](url)', placeholder: 'текст ссылки' },
    image: { prefix: '![', suffix: '](url)', placeholder: 'описание' },
    h1: { prefix: '# ', suffix: '', placeholder: 'Заголовок' },
    h2: { prefix: '## ', suffix: '', placeholder: 'Заголовок' },
    h3: { prefix: '### ', suffix: '', placeholder: 'Заголовок' },
    ul: { prefix: '- ', suffix: '', placeholder: 'Элемент списка' },
    ol: { prefix: '1. ', suffix: '', placeholder: 'Элемент списка' },
    task: { prefix: '- [ ] ', suffix: '', placeholder: 'Задача' },
    quote: { prefix: '> ', suffix: '', placeholder: 'Цитата' },
    hr: { prefix: '\n---\n', suffix: '', placeholder: '' },
    codeblock: { prefix: '```\n', suffix: '\n```', placeholder: 'код' },
    table: { prefix: '| Заголовок 1 | Заголовок 2 |\n| --- | --- |\n| ', suffix: ' | данные |', placeholder: 'данные' },
};

const SHORTCUTS: Record<string, string> = {
    'b': 'bold', 'i': 'italic', 'k': 'code', 'l': 'link',
    'h': 'h2', 'u': 'ul', 'o': 'ol', 'q': 'quote',
};

const SHORTCUT_LABELS: Record<string, string> = {
    bold: 'Ctrl+B', italic: 'Ctrl+I', code: 'Ctrl+K', link: 'Ctrl+L',
    h2: 'Ctrl+H', ul: 'Ctrl+U', ol: 'Ctrl+O', quote: 'Ctrl+Q',
};

// ========= Context menu items =========
const CTX_GROUPS = [
    {
        label: 'Форматирование',
        items: [
            { key: 'bold', label: 'Жирный', shortcut: 'Ctrl+B' },
            { key: 'italic', label: 'Курсив', shortcut: 'Ctrl+I' },
            { key: 'bolditalic', label: 'Жирный курсив', shortcut: '' },
            { key: 'strike', label: 'Зачёркнутый', shortcut: '' },
            { key: 'code', label: 'Код', shortcut: 'Ctrl+K' },
        ]
    },
    {
        label: 'Заголовки',
        items: [
            { key: 'h1', label: 'H1 — Заголовок 1', shortcut: '' },
            { key: 'h2', label: 'H2 — Заголовок 2', shortcut: 'Ctrl+H' },
            { key: 'h3', label: 'H3 — Заголовок 3', shortcut: '' },
        ]
    },
    {
        label: 'Вставить',
        items: [
            { key: 'link', label: 'Ссылка', shortcut: 'Ctrl+L' },
            { key: 'image', label: 'Изображение', shortcut: '' },
            { key: 'codeblock', label: 'Блок кода', shortcut: '' },
            { key: 'table', label: 'Таблица', shortcut: '' },
            { key: 'hr', label: 'Разделитель', shortcut: '' },
        ]
    },
    {
        label: 'Списки',
        items: [
            { key: 'ul', label: 'Маркированный', shortcut: 'Ctrl+U' },
            { key: 'ol', label: 'Нумерованный', shortcut: 'Ctrl+O' },
            { key: 'task', label: 'Задачи', shortcut: '' },
            { key: 'quote', label: 'Цитата', shortcut: 'Ctrl+Q' },
        ]
    },
];

// ========= Main component =========
interface Props {
    test: Test | null;
    onSave: (test: Test) => Promise<void>;
    onCancel: () => void;
}

export default function TestEditor({ test, onSave, onCancel }: Props) {
    const isNew = !test;

    const [title, setTitle] = useState(test?.title || '');
    const [description] = useState(test?.description || '');
    const [gradingMode, setGradingMode] = useState<GradingMode>(test?.gradingMode || 'auto-simple');
    const [published, setPublished] = useState(test?.published ?? false);
    const [timeLimit, setTimeLimit] = useState<number>(test?.timeLimit || 0);
    const [stages, setStages] = useState<TestStage[]>(test?.stages || [createEmptyStage()]);
    const [images, setImages] = useState<Record<string, { name: string, data: string }>>(test?.images || {});
    const [activeStage, setActiveStage] = useState(0);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: 'content' | 'question'; qIdx?: number } | null>(null);

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const questionRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get active ref
    const getActiveRef = useCallback(() => {
        if (ctxMenu?.target === 'question' && ctxMenu.qIdx !== undefined) {
            const qId = stages[activeStage]?.questions[ctxMenu.qIdx]?.id;
            return qId ? questionRefs.current[qId] : null;
        }
        return contentRef.current;
    }, [ctxMenu, stages, activeStage]);

    // Insert format
    const insertFormat = useCallback((ta: HTMLTextAreaElement | null, key: string) => {
        if (!ta) return;
        const fmt = FORMATS[key];
        if (!fmt) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        const sel = val.substring(start, end) || fmt.placeholder;
        const newVal = val.substring(0, start) + fmt.prefix + sel + fmt.suffix + val.substring(end);

        // Update the state through the appropriate handler
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(ta, newVal);
        ta.dispatchEvent(new Event('input', { bubbles: true }));

        requestAnimationFrame(() => {
            ta.focus();
            const newCursor = start + fmt.prefix.length + sel.length;
            ta.setSelectionRange(start + fmt.prefix.length, newCursor);
        });
    }, []);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, ta: HTMLTextAreaElement | null) => {
        if (e.ctrlKey || e.metaKey) {
            const code = e.code.replace('Key', '').toLowerCase();
            const keyToUse = SHORTCUTS[code] || SHORTCUTS[e.key.toLowerCase()];
            if (keyToUse) {
                e.preventDefault();
                insertFormat(ta, keyToUse);
            }
        }
        // Tab key for indent
        if (e.key === 'Tab') {
            e.preventDefault();
            insertFormat(ta, '');
            if (ta) {
                const start = ta.selectionStart;
                const val = ta.value;
                const newVal = val.substring(0, start) + '  ' + val.substring(ta.selectionEnd);
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
                nativeInputValueSetter?.call(ta, newVal);
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2); });
            }
        }
    }, [insertFormat]);

    // Handle context menu
    const handleContextMenu = useCallback((e: React.MouseEvent, target: 'content' | 'question', qIdx?: number) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, target, qIdx });
    }, []);

    // Close context menu on click
    useEffect(() => {
        const handler = () => setCtxMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // Handle image upload
    const handleImageUpload = useCallback(async (file: File, target: HTMLTextAreaElement | null) => {
        if (!file || !target) return;
        if (file.size > 10 * 1024 * 1024) { toast.error('Файл слишком большой (макс. 10 МБ)'); return; }
        if (!file.type.startsWith('image/')) { toast.error('Допускаются только изображения'); return; }
        try {
            const dataUrl = await compressImage(file);
            const id = generateId();
            setImages(prev => ({ ...prev, [id]: { name: file.name, data: dataUrl } }));
            const md = `![${file.name}](db-image://${id})`;
            const start = target.selectionStart;
            const val = target.value;
            const newVal = val.substring(0, start) + md + val.substring(target.selectionEnd);
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
            nativeInputValueSetter?.call(target, newVal);
            target.dispatchEvent(new Event('input', { bubbles: true }));
        } catch {
            toast.error('Ошибка загрузки изображения');
        }
    }, []);

    // Drag and drop
    const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleImageUpload(file, e.currentTarget);
    }, [handleImageUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

    // Stage management
    const updateStage = (idx: number, patch: Partial<TestStage>) => {
        setStages(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
    };

    const addStage = () => {
        const s = createEmptyStage();
        s.title = `Этап ${stages.length + 1}`;
        setStages(prev => [...prev, s]);
        setActiveStage(stages.length);
    };

    const removeStage = (idx: number) => {
        if (stages.length <= 1) return;
        setStages(prev => prev.filter((_, i) => i !== idx));
        if (activeStage >= idx && activeStage > 0) setActiveStage(activeStage - 1);
    };

    // Question management
    const updateQuestion = (qIdx: number, patch: Partial<TestQuestion>) => {
        const qs = [...stages[activeStage].questions];
        qs[qIdx] = { ...qs[qIdx], ...patch };
        updateStage(activeStage, { questions: qs });
    };

    const addQuestion = () => {
        const qs = [...stages[activeStage].questions, createEmptyQuestion()];
        updateStage(activeStage, { questions: qs });
    };

    const removeQuestion = (qIdx: number) => {
        const qs = stages[activeStage].questions.filter((_, i) => i !== qIdx);
        updateStage(activeStage, { questions: qs.length ? qs : [createEmptyQuestion()] });
    };

    // Option management
    const updateOption = (qIdx: number, oIdx: number, text: string) => {
        const q = stages[activeStage].questions[qIdx];
        const opts = q.options.map((o, i) => i === oIdx ? { ...o, text } : o);
        updateQuestion(qIdx, { options: opts });
    };

    const setCorrectOption = (qIdx: number, oIdx: number) => {
        const q = stages[activeStage].questions[qIdx];
        const opts = q.options.map((o, i) => i === oIdx ? { ...o, correct: !o.correct } : o);
        updateQuestion(qIdx, { options: opts });
    };

    const addOption = (qIdx: number) => {
        const q = stages[activeStage].questions[qIdx];
        updateQuestion(qIdx, { options: [...q.options, { text: '', correct: false }] });
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        const q = stages[activeStage].questions[qIdx];
        if (q.options.length <= 2) return;
        updateQuestion(qIdx, { options: q.options.filter((_, i) => i !== oIdx) });
    };

    // Save
    const handleSave = async () => {
        if (!title.trim()) { toast.error('Введите название теста'); return; }
        if (stages.some(s => s.questions.some(q => !q.text.trim()))) { toast.error('Заполните текст всех вопросов'); return; }
        setSaving(true);
        try {
            const t: Test = {
                id: test?.id || generateId(),
                title: title.trim(),
                description,
                createdBy: test?.createdBy || '',
                createdAt: test?.createdAt || Date.now(),
                updatedAt: Date.now(),
                gradingMode,
                published,
                timeLimit: timeLimit > 0 ? timeLimit : undefined,
                stages,
                images,
            };
            await onSave(t);
        } catch {
            toast.error('Ошибка сохранения');
        }
        setSaving(false);
    };

    const stg = stages[activeStage] || stages[0];

    const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-200)' };

    return (
        <div className="animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>
                    {isNew ? 'Создать тест' : 'Редактировать тест'}
                </h2>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-500)' }}>
                        Отмена
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--accent)' }}>
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            </div>

            {/* Title & settings */}
            <div className="space-y-3 mb-6">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название теста"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold focus:outline-none" style={inputStyle} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-600)' }}>Режим проверки</label>
                        <select value={gradingMode} onChange={e => setGradingMode(e.target.value as GradingMode)}
                            className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none" style={inputStyle}>
                            <option value="auto-simple">Авто (простой)</option>
                            <option value="auto-complex">Авто (сложный)</option>
                            <option value="manual">Ручной</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-600)' }}>Время на тест (мин)</label>
                        <input type="number" min="0" value={timeLimit || ''} onChange={e => setTimeLimit(Number(e.target.value))}
                            placeholder="Без таймера" className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none" style={inputStyle} />
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer pb-2">
                            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)}
                                className="w-4 h-4 rounded" />
                            <span className="text-sm" style={{ color: 'var(--text-400)' }}>Опубликован</span>
                        </label>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => setShowHelp(!showHelp)} className="text-[11px] transition-colors"
                            style={{ color: 'var(--accent-light)' }}>
                            {showHelp ? 'Скрыть подсказку' : '📝 Подсказка по форматированию'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Formatting help */}
            {showHelp && (
                <div className="rounded-xl p-4 mb-6 text-[12px] space-y-2 animate-fade-in-up" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-200)' }}>Горячие клавиши</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(SHORTCUT_LABELS).map(([key, label]) => (
                            <div key={key} className="flex justify-between px-2 py-1 rounded" style={{ background: 'var(--bg-card-hover)' }}>
                                <span style={{ color: 'var(--text-400)' }}>{FORMATS[key]?.prefix.trim() || key}</span>
                                <span className="font-mono" style={{ color: 'var(--text-600)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="font-semibold mt-3 mb-2" style={{ color: 'var(--text-200)' }}>Синтаксис Markdown</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1" style={{ color: 'var(--text-500)' }}>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>**жирный**</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>*курсив*</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>~~зачёркнутый~~</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>`код`</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}># Заголовок</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>[текст](url)</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>![alt](url)</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>&gt; цитата</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>---</code></span>
                        <span><code className="font-mono" style={{ color: 'var(--accent-light)' }}>- [ ] задача</code></span>
                    </div>
                    <p className="mt-2" style={{ color: 'var(--text-600)' }}>Правый клик по полю ввода — меню форматирования. Перетащите изображение на поле для вставки.</p>
                </div>
            )}

            {/* Stage tabs */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {stages.map((s, i) => (
                    <button key={s.id} onClick={() => setActiveStage(i)}
                        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                        style={i === activeStage
                            ? { background: 'var(--accent)', color: '#fff' }
                            : { border: '1px solid var(--border)', color: 'var(--text-500)', background: 'var(--bg-card)' }
                        }>
                        {s.title || `Этап ${i + 1}`}
                        {stages.length > 1 && i > 0 && (
                            <span onClick={e => { e.stopPropagation(); removeStage(i); }}
                                className="opacity-0 group-hover:opacity-100 ml-1 transition-opacity" style={{ color: i === activeStage ? 'rgba(255,255,255,0.6)' : 'var(--text-700)' }}>
                                ×
                            </span>
                        )}
                    </button>
                ))}
                <button onClick={addStage} className="px-2.5 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ border: '1px dashed var(--border)', color: 'var(--text-600)' }}>
                    +
                </button>
            </div>

            {/* Stage title */}
            <input type="text" value={stg.title} onChange={e => updateStage(activeStage, { title: e.target.value })}
                placeholder="Название этапа" className="w-full px-3.5 py-2 rounded-xl text-sm focus:outline-none mb-4" style={inputStyle} />

            {/* Content editor */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>
                        Контент этапа (Markdown)
                    </label>
                    <button onClick={() => setShowPreview(!showPreview)} className="text-[11px]" style={{ color: 'var(--accent-light)' }}>
                        {showPreview ? 'Редактор' : 'Предпросмотр'}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-1 mb-2 p-1.5 rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    {[
                        { key: 'bold', icon: 'B', bold: true },
                        { key: 'italic', icon: 'I', italic: true },
                        { key: 'strike', icon: 'S' },
                        { key: 'code', icon: '<>' },
                        { key: 'sep1', sep: true },
                        { key: 'h1', icon: 'H1' },
                        { key: 'h2', icon: 'H2' },
                        { key: 'h3', icon: 'H3' },
                        { key: 'sep2', sep: true },
                        { key: 'ul', icon: '•' },
                        { key: 'ol', icon: '1.' },
                        { key: 'task', icon: '☑' },
                        { key: 'quote', icon: '❝' },
                        { key: 'sep3', sep: true },
                        { key: 'link', icon: '🔗' },
                        { key: 'codeblock', icon: '{ }' },
                        { key: 'table', icon: '⊞' },
                        { key: 'hr', icon: '—' },
                    ].map(btn =>
                        btn.sep ? (
                            <div key={btn.key} className="w-px mx-0.5" style={{ background: 'var(--border)' }} />
                        ) : (
                            <button key={btn.key} onClick={() => insertFormat(contentRef.current, btn.key)}
                                title={`${btn.icon} ${SHORTCUT_LABELS[btn.key] || ''}`}
                                className="px-2 py-1 rounded text-[11px] font-mono transition-colors"
                                style={{ color: 'var(--text-400)', fontWeight: btn.bold ? 700 : btn.italic ? 400 : 500, fontStyle: btn.italic ? 'italic' : 'normal' }}>
                                {btn.icon}
                            </button>
                        )
                    )}
                    <div className="flex-1" />
                    <button onClick={() => fileInputRef.current?.click()} className="px-2 py-1 rounded text-[11px] transition-colors" style={{ color: 'var(--text-400)' }}>
                        📎 Фото
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, contentRef.current); e.target.value = ''; }} />
                </div>

                {showPreview ? (
                    <div className="min-h-[200px] p-4 rounded-xl markdown-content" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(stg.content, images) }} />
                ) : (
                    <textarea
                        ref={contentRef}
                        value={stg.content}
                        onChange={e => updateStage(activeStage, { content: e.target.value })}
                        onKeyDown={e => handleKeyDown(e, contentRef.current)}
                        onContextMenu={e => handleContextMenu(e, 'content')}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        placeholder="Введите содержимое этапа в формате Markdown...&#10;&#10;Перетащите изображение сюда для вставки"
                        className="w-full min-h-[200px] px-3.5 py-3 rounded-xl text-sm font-mono focus:outline-none resize-y"
                        style={inputStyle}
                    />
                )}
            </div>

            {/* Questions */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-600)' }}>Вопросы</label>
                    <button onClick={addQuestion} className="text-[11px] px-2.5 py-1 rounded-lg" style={{ color: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
                        + Вопрос
                    </button>
                </div>

                <div className="space-y-4">
                    {stg.questions.map((q, qIdx) => (
                        <div key={q.id} className="rounded-xl p-4" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--text-600)', background: 'var(--bg-card-hover)' }}>
                                    Q{qIdx + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                    {/* Type toggle */}
                                    <select value={q.type} onChange={e => updateQuestion(qIdx, { type: e.target.value as 'choice' | 'text' })}
                                        className="px-2 py-1 rounded-lg text-[11px] focus:outline-none" style={inputStyle}>
                                        <option value="choice">Выбор ответа</option>
                                        <option value="text">Текстовое поле</option>
                                    </select>
                                    {gradingMode === 'auto-complex' && (
                                        <input type="number" value={q.points} min={1} onChange={e => updateQuestion(qIdx, { points: Number(e.target.value) || 1 })}
                                            className="w-14 px-2 py-1 rounded-lg text-[11px] text-center focus:outline-none" style={inputStyle} title="Баллы" />
                                    )}
                                    <button onClick={() => removeQuestion(qIdx)} className="text-[11px] px-1.5 py-0.5 rounded transition-colors" style={{ color: 'var(--red)' }}>✕</button>
                                </div>
                            </div>

                            {/* Question text */}
                            <textarea
                                ref={el => { questionRefs.current[q.id] = el; }}
                                value={q.text}
                                onChange={e => updateQuestion(qIdx, { text: e.target.value })}
                                onKeyDown={e => handleKeyDown(e, questionRefs.current[q.id])}
                                onContextMenu={e => handleContextMenu(e, 'question', qIdx)}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                placeholder="Текст вопроса (поддерживает Markdown)"
                                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-y min-h-[60px] mb-3"
                                style={inputStyle}
                            />

                            {/* Choice options */}
                            {q.type === 'choice' && (
                                <div className="space-y-2 mb-3">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            <button onClick={() => setCorrectOption(qIdx, oIdx)}
                                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                                                style={{
                                                    borderColor: opt.correct ? 'var(--green)' : 'var(--border-hover)',
                                                    background: opt.correct ? 'var(--green)' : 'transparent'
                                                }}>
                                                {opt.correct && <span className="text-white text-[10px]">✓</span>}
                                            </button>
                                            <input type="text" value={opt.text} onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                                placeholder={`Вариант ${oIdx + 1}`}
                                                className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none" style={inputStyle} />
                                            {q.options.length > 2 && (
                                                <button onClick={() => removeOption(qIdx, oIdx)} className="text-[11px] px-1 transition-colors" style={{ color: 'var(--text-700)' }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => addOption(qIdx)} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-600)', border: '1px dashed var(--border)' }}>
                                        + Вариант
                                    </button>
                                </div>
                            )}

                            {/* Text input */}
                            {q.type === 'text' && gradingMode !== 'manual' && (
                                <div className="mb-3">
                                    <label className="block text-[10px] mb-1" style={{ color: 'var(--text-600)' }}>Правильный ответ (для автопроверки)</label>
                                    <input type="text" value={q.correctAnswers[0] || ''} onChange={e => updateQuestion(qIdx, { correctAnswers: [e.target.value] })}
                                        placeholder="Введите правильный ответ"
                                        className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none" style={inputStyle} />
                                </div>
                            )}

                            {/* Explanation */}
                            <details className="group">
                                <summary className="text-[11px] cursor-pointer transition-colors" style={{ color: 'var(--text-600)' }}>
                                    Пояснение (необязательно)
                                </summary>
                                <textarea value={q.explanation} onChange={e => updateQuestion(qIdx, { explanation: e.target.value })}
                                    placeholder="Почему этот ответ правильный?"
                                    className="w-full mt-2 px-3 py-2 rounded-lg text-sm focus:outline-none resize-y min-h-[50px]" style={inputStyle} />
                            </details>
                        </div>
                    ))}
                </div>
            </div>

            {/* Context menu */}
            {ctxMenu && (
                <div className="fixed z-[100] rounded-xl overflow-hidden shadow-xl animate-fade-in-up"
                    style={{ top: ctxMenu.y, left: ctxMenu.x, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 200, maxHeight: '80vh', overflowY: 'auto' }}
                    onClick={e => e.stopPropagation()}>
                    {CTX_GROUPS.map((group, gi) => (
                        <div key={gi}>
                            {gi > 0 && <div className="h-px" style={{ background: 'var(--border)' }} />}
                            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-700)' }}>{group.label}</div>
                            {group.items.map(item => (
                                <button key={item.key} onClick={() => { insertFormat(getActiveRef(), item.key); setCtxMenu(null); }}
                                    className="w-full text-left px-3 py-1.5 text-[12px] flex justify-between items-center transition-colors"
                                    style={{ color: 'var(--text-400)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <span>{item.label}</span>
                                    {item.shortcut && <span className="text-[10px] font-mono" style={{ color: 'var(--text-700)' }}>{item.shortcut}</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
