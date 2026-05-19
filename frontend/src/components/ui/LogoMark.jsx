import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/index.jsx';

export function LogoMark({ size = 'md' }) {
  const { t } = useTranslation();
  const sizes = {
    sm: { arabic: 'text-2xl', latin: 'text-[10px]' },
    md: { arabic: 'text-3xl', latin: 'text-[11px]' },
    lg: { arabic: 'text-4xl', latin: 'text-[12px]' },
  };
  const current = sizes[size] ?? sizes.md;
  return (
    <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0" aria-label={t('topbar.homeAria')}>
      <div className="flex flex-col items-center leading-none gap-0.5">
        <span
          className={`${current.arabic} font-bold text-sage-600 group-hover:text-sage-700 transition-colors`}
          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: 1.1 }}
        >
          {t('common.appNameArabic')}
        </span>
        <span
          className={`${current.latin} font-semibold tracking-[0.22em] text-warm-400 uppercase`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {t('common.appNameLatin')}
        </span>
      </div>
    </Link>
  );
}

export default LogoMark;
