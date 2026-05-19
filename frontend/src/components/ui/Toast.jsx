import { useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 3500);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold whitespace-nowrap ${
        type === 'success' ? 'bg-sage-500 text-white' : 'bg-danger text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}
