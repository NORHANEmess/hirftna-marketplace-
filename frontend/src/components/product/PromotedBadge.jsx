import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n/index.jsx';

export default function PromotedBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-md bg-sage-500 text-white shadow-sm">
      <Sparkles size={8} />
      {t('product.badge.promoted')}
    </span>
  );
}
