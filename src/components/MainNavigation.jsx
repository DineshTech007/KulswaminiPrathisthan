import { NavLink } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext.jsx';

const navLinks = [
  { to: '/family', key: 'nav.familyTree', exact: true },
  { to: '/directory', key: 'nav.directory', exact: true },
  { to: '/about', key: 'nav.about', exact: true },
  { to: '/contact', key: 'nav.contact', exact: true },
];

const baseClass =
  'rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500';

const MainNavigation = () => {
  const { t } = useTranslation();

  return (
    <nav
      className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60"
      aria-label={t('sidebar.navigation')}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `text-base font-bold tracking-wide ${
              isActive ? 'text-primary-600' : 'text-slate-900 hover:text-primary-600'
            }`
          }
        >
          {t('sidebar.home')}
        </NavLink>
        <div className="flex flex-wrap items-center gap-2">
          {navLinks.map(({ to, key, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `${baseClass} ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                }`
              }
            >
              {t(key)}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default MainNavigation;
