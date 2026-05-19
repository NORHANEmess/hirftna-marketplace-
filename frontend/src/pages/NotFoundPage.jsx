import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/index.jsx';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-5xl font-bold text-warm-800 mb-2">404</h1>
        <p className="text-xl text-warm-600 mb-2">{t('common.notFound')}</p>
        <p className="text-sm text-warm-400 mb-8">{t('common.notFoundMessage')}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-sage-500 text-white rounded-lg font-semibold hover:bg-sage-600 transition-colors"
          >
            {t('common.goHome')}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 border-2 border-sage-500 text-sage-500 rounded-lg font-semibold hover:bg-cream-200 transition-colors"
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    </div>
  );
}
