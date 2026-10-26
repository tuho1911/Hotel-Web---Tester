import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { useThemeStore } from '../store/themeStore';
import { Menu, X, Sun, Moon, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthorizedHomePath } from '../utils/authNavigation';
import { useTranslation } from 'react-i18next';

import NotificationBell from '../components/notification/NotificationBell';
import Footer from '../components/common/Footer';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/rooms', label: 'Phòng' },
  { to: '/services', label: 'Dịch vụ' },
  { to: '/news', label: 'Tin tức' },
  { to: '/attractions', label: 'Khám phá' },
  { to: '/about', label: 'Giới thiệu' },
  { to: '/contact', label: 'Liên hệ' },
];

const getMembershipBadgeClass = (membershipName?: string | null) => {
  const label = membershipName?.toLowerCase() ?? '';
  if (label.includes('platinum')) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
  if (label.includes('gold')) return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white';
  if (label.includes('silver')) return 'bg-gradient-to-r from-slate-300 to-slate-500 text-white';
  return 'bg-primary/10 text-primary';
};

const getMembershipDisplayName = (membershipName: string | null | undefined, t: any) => membershipName || t('common.no_info');

const MainLayout: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const navItems = React.useMemo(() => [
    { to: '/', label: t('nav.home') },
    { to: '/rooms', label: t('nav.rooms') },
    { to: '/services', label: t('nav.services') },
    { to: '/news', label: t('nav.news') },
    { to: '/attractions', label: t('nav.explore') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ], [t]);

  const dashboardPath = getAuthorizedHomePath(user);
  const canOpenDashboard =
    isAuthenticated && (dashboardPath.startsWith('/admin') || dashboardPath.startsWith('/staff'));

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark' : ''} bg-[var(--bg-main)] text-[var(--text-body)]`}>
      <header className="sticky top-0 z-50 bg-[var(--card-bg)]/80 backdrop-blur-lg border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-4 h-20">
            <div className="flex items-center min-w-0">
              <Link to="/" className="text-xl sm:text-2xl font-display font-black !text-primary tracking-[0.25em] sm:tracking-widest">
                KANT
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-12">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-xs font-bold !text-[var(--text-muted)] hover:!text-primary tracking-[0.2em] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-primary/5 transition-all shadow-sm"
                title={isDarkMode ? t('common.light_mode') : t('common.dark_mode')}
              >
                {isDarkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-indigo-500" />}
              </button>

              <button
                onClick={toggleLanguage}
                className="p-2.5 rounded-xl border border-[var(--border-color)] text-primary font-bold hover:bg-primary/5 transition-all shadow-sm min-w-[45px]"
                title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              >
                {i18n.language === 'vi' ? 'VI' : 'EN'}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center space-x-6">
                  <NotificationBell />
                  <div className="relative group">
                    <button className="flex items-center space-x-3 p-1 rounded-full border border-primary/10 hover:border-primary/30 transition-all">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user?.name?.charAt(0)}
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs font-bold text-title tracking-wider">{user?.name}</span>
                        {user?.membershipName && (
                          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getMembershipBadgeClass(user.membershipName)}`}>
                            <Crown size={10} />
                            {getMembershipDisplayName(user.membershipName, t)}
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="absolute right-0 mt-2 w-56 bg-[var(--card-bg)] border border-luxury rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                      {user?.membershipName && (
                        <div className="px-4 pb-2 mb-2 border-b border-luxury">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-muted">{t('common.membership')}</div>
                          <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${getMembershipBadgeClass(user.membershipName)}`}>
                            <Crown size={12} />
                            {getMembershipDisplayName(user.membershipName, t)}
                          </div>
                          {user.membershipDiscountPercent != null && (
                            <div className="mt-2 text-[11px] text-muted">{t('common.discount')}: {user.membershipDiscountPercent}%</div>
                          )}
                        </div>
                      )}
                      <Link to="/profile" className="block px-4 py-2 text-xs font-bold text-muted hover:bg-primary/5 hover:!text-primary transition-colors">{t('common.profile')}</Link>
                      {canOpenDashboard && (
                        <Link to={dashboardPath} className="block px-4 py-2 text-xs font-bold text-muted hover:bg-primary/5 hover:!text-primary transition-colors">{t('nav.dashboard')}</Link>
                      )}
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-bold text-error hover:bg-error/10 transition-colors">{t('nav.logout')}</button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="btn-gold px-8 py-2 text-xs">{t('common.login')}</Link>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-primary/5 transition-all shadow-sm"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-indigo-500" />}
              </button>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-500 p-2">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[var(--card-bg)] border-b border-luxury overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className="block px-3 py-4 text-xs font-bold text-muted hover:text-primary tracking-widest"
                  >
                    {item.label}
                  </Link>
                ))}
                
                {isAuthenticated && (
                  <>
                    {user?.membershipName && (
                      <div className="px-3 py-2 mx-1 mb-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{t('common.membership')}</div>
                        <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getMembershipBadgeClass(user.membershipName)}`}>
                          <Crown size={11} />
                          {getMembershipDisplayName(user.membershipName, t)}
                        </div>
                        {user.membershipDiscountPercent != null && (
                          <div className="mt-2 text-[11px] text-[var(--text-muted)]">{t('common.discount')}: {user.membershipDiscountPercent}%</div>
                        )}
                      </div>
                    )}
                    {canOpenDashboard && (
                      <Link to={dashboardPath} onClick={closeMobileMenu} className="block px-3 py-4 text-xs font-bold text-muted hover:text-primary tracking-widest">
                        {t('nav.dashboard')}
                      </Link>
                    )}
                    <Link to="/profile" onClick={closeMobileMenu} className="block px-3 py-4 text-xs font-bold text-muted hover:text-primary tracking-widest">
                      {t('common.profile')}
                    </Link>
                    <button onClick={handleLogout} className="block w-full text-left px-3 py-4 text-xs font-bold text-error tracking-widest hover:bg-error/10">
                      {t('nav.logout')}
                    </button>
                  </>
                )}
                {!isAuthenticated && (
                  <Link to="/login" onClick={closeMobileMenu} className="block px-3 py-4 text-xs font-bold text-primary tracking-widest">{t('common.login')}</Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-grow transition-colors duration-300">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
