import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    isDestructive = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] backdrop-blur-sm"
                        style={{ background: 'rgba(0,0,0,0.4)' }}
                        onClick={onCancel}
                    />
                    <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none px-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                            className="w-full max-w-sm rounded-2xl pointer-events-auto shadow-2xl overflow-hidden"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: isDestructive ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)' }}>
                                        <AlertTriangle size={20} style={{ color: isDestructive ? 'var(--red)' : 'var(--accent)' }} />
                                    </div>
                                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-100)' }}>
                                        {title}
                                    </h3>
                                </div>
                                <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-300)' }}>
                                    {message}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-neutral-500/10 active:scale-95"
                                        style={{ color: 'var(--text-200)', border: '1px solid var(--border)' }}
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onConfirm();
                                            onCancel();
                                        }}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
                                        style={{
                                            background: isDestructive ? 'var(--red)' : 'var(--accent)',
                                            boxShadow: isDestructive ? '0 4px 14px 0 rgba(239,68,68,0.39)' : '0 4px 14px 0 rgba(139,92,246,0.39)'
                                        }}
                                    >
                                        {confirmText}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
