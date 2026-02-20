import { Link, useLocation } from 'react-router-dom';
import { Home, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
    const { currentUser, userProfile } = useAuth();
    const location = useLocation();

    // Hide on test taking page
    if (location.pathname.startsWith('/test/')) return null;

    const isActive = (path: string) => location.pathname === path;

    const links = [
        { path: '/', label: 'Главная', icon: Home },
        ...(currentUser ? [{ path: '/profile', label: 'Профиль', icon: User }] : []),
        ...(userProfile?.admin ? [{ path: '/admin', label: 'Управление', icon: ShieldCheck }] : []),
    ];

    if (!currentUser) return null; // Only show bottom nav for logged in users

    return (
        <>
            {/* Spacer to prevent content from being hidden behind the bottom bar */}
            <div className="h-16 md:hidden" />

            {/* The actual bottom bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl"
                style={{
                    background: 'rgba(var(--bg-rgb), 0.85)',
                    borderTop: '1px solid var(--border)',
                    paddingBottom: 'env(safe-area-inset-bottom)' // iOS Safe Area support
                }}>
                <div className="flex justify-around items-center h-16 px-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className="flex flex-col items-center justify-center w-full h-full relative"
                            >
                                {active && (
                                    <div className="absolute top-0 w-8 h-1 rounded-b-full transition-all duration-300"
                                        style={{ background: 'var(--accent)' }} />
                                )}
                                <Icon
                                    size={22}
                                    strokeWidth={active ? 2.5 : 2}
                                    className="mb-1 transition-all duration-300"
                                    style={{ color: active ? 'var(--accent-light)' : 'var(--text-400)' }}
                                />
                                <span className="text-[10px] font-medium transition-colors duration-300"
                                    style={{ color: active ? 'var(--text-100)' : 'var(--text-500)' }}>
                                    {link.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
