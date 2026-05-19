import { BadgeCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/index.jsx';

/**
 * VerifiedBadge — shown next to a seller's name when is_verified is true.
 * size: 'sm' | 'md' (default 'sm')
 */
export default function VerifiedBadge({ size = 'sm' }) {
  const { t } = useTranslation();

  const iconSize  = size === 'md' ? 16 : 13;
  const textClass = size === 'md' ? 'text-xs'  : 'text-[10px]';
  const gapClass  = size === 'md' ? 'gap-1'    : 'gap-0.5';
  const padClass  = size === 'md' ? 'px-2 py-1' : 'px-1.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center ${gapClass} ${padClass} bg-sage-50 border border-sage-200 text-sage-700 rounded-full font-medium ${textClass} leading-none`}
      title={t('verification.badge.tooltip')}
    >
      <BadgeCheck size={iconSize} className="text-sage-600 flex-shrink-0" />
      {t('verification.badge.label')}
    </span>
  );
}
