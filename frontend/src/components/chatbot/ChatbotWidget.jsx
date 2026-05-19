import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { chatbotAPI, resolveApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Typing indicator ─────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-sage-600" />
      </div>
      <div className="bg-white border border-beige-200 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Single message bubble ────────────────────────────────────
function MessageBubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-sage-600" />
        </div>
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-sage-500 text-white rounded-br-sm'
            : 'bg-white border border-beige-200 text-warm-800 rounded-bl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  );
}

// ─── Quick suggestion chips ───────────────────────────────────
function SuggestionChips({ suggestions, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2 mb-3">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="text-xs px-3 py-1.5 rounded-full border border-sage-200 bg-sage-50 text-sage-700 hover:bg-sage-100 transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────
export default function ChatbotWidget() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isArabic = i18n.language === 'ar';

  const welcomeMessage = isArabic
    ? 'مرحبا! أنا مساعد حرفتنا. يمكنني مساعدتك في العثور على المنتجات، شرح كيفية الطلب، أو الإجابة على أي سؤال حول المنصة. كيف يمكنني مساعدتك؟'
    : t('chatbot.welcome');

  const suggestions = isArabic
    ? ['كيف تعمل الطلبات؟', 'ما هي الفئات المتاحة؟', 'كيف أتواصل مع البائع؟']
    : [
        t('chatbot.suggestion1'),
        t('chatbot.suggestion2'),
        t('chatbot.suggestion3'),
      ];

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasOpened) {
      setHasOpened(true);
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
    }
  };

  const handleClose = () => setIsOpen(false);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setShowSuggestions(false);
    setInput('');

    const userMsg = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Build history to send (last 20 messages, excluding the one we just added)
    const history = [...messages, userMsg].slice(-20);

    try {
      const res = await chatbotAPI.sendMessage(trimmed, history.slice(0, -1));
      const reply = res.data?.data?.reply || t('chatbot.fallback');
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const { message } = resolveApiError(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message || t('chatbot.fallback') },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Only show for authenticated users
  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        aria-label={isOpen ? t('chatbot.close') : t('chatbot.open')}
        className={`fixed bottom-20 right-4 z-40 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-warm-700 rotate-0 scale-95'
            : 'bg-sage-500 hover:bg-sage-600 animate-bounce'
        }`}
        style={{ width: 52, height: 52 }}
      >
        {isOpen ? (
          <X size={22} className="text-white" />
        ) : (
          <MessageCircle size={22} className="text-white" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          dir={isArabic ? 'rtl' : 'ltr'}
          className="fixed bottom-36 right-4 z-40 flex flex-col bg-cream-100 rounded-2xl shadow-2xl border border-beige-200 overflow-hidden
            w-[calc(100vw-2rem)] max-w-[380px]
            h-[500px] sm:h-[500px]"
          style={{ maxHeight: 'calc(85vh - 8rem)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-beige-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sage-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-900">{t('chatbot.title')}</p>
                <p className="text-[10px] text-warm-400">{t('chatbot.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-beige-100 transition-colors text-warm-400 hover:text-warm-700"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1">
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} role={msg.role} content={msg.content} />
            ))}

            {/* Suggestion chips — shown after welcome message */}
            {showSuggestions && messages.length === 1 && (
              <SuggestionChips suggestions={suggestions} onSelect={sendMessage} />
            )}

            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 px-3 py-3 bg-white border-t border-beige-200 flex-shrink-0"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chatbot.placeholder')}
              disabled={isLoading}
              rows={1}
              maxLength={1000}
              className="flex-1 resize-none rounded-xl border border-beige-200 bg-cream-50 px-3 py-2 text-sm text-warm-800 placeholder-warm-300 focus:outline-none focus:ring-2 focus:ring-sage-300 disabled:opacity-50"
              style={{ maxHeight: 80 }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
