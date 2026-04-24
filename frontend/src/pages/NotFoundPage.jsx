import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* 404 Icon */}
          <div className="text-8xl mb-6">🔍</div>

          {/* Heading */}
          <h1 className="text-5xl font-bold text-warm-800 mb-2">404</h1>

          {/* Message */}
          <p className="text-xl text-warm-600 mb-2">Page Not Found</p>
          <p className="text-sm text-warm-400 mb-8">
            Oops! It looks like the page you're looking for doesn't exist or has been moved.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-sage-500 text-white rounded-lg font-semibold hover:bg-sage-600 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-3 border-2 border-sage-500 text-sage-500 rounded-lg font-semibold hover:bg-cream-200 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
  );
}