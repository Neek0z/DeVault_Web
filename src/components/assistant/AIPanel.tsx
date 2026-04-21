import { ArrowUp, Mic, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useAssistant, type ProjectContext } from '../../hooks/useAssistant';
import { isOpenRouterConfigured } from '../../lib/openrouter';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import styles from './AIPanel.module.css';

const SUGGESTIONS = ['Résume ma semaine', 'Ouvre les bugs', 'Brouillon release notes'];

interface Props {
  onClose: () => void;
  projectContext?: ProjectContext;
}

export function AIPanel({ onClose, projectContext }: Props) {
  const { messages, loading, error, sendUserMessage } = useAssistant();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition({
    lang: 'fr-FR',
    onResult: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
  });
  const pressRef = useRef<{ startedAt: number; startedListening: boolean } | null>(null);

  const HOLD_MS = 300;

  function onMicPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (!speech.supported || !configured || loading) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const alreadyListening = speech.listening;
    if (!alreadyListening) speech.start();
    pressRef.current = {
      startedAt: Date.now(),
      startedListening: !alreadyListening,
    };
  }

  function onMicPointerUp(e: PointerEvent<HTMLButtonElement>) {
    const press = pressRef.current;
    pressRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!press) return;
    const held = Date.now() - press.startedAt > HOLD_MS;
    if (held) {
      speech.stop();
    } else if (!press.startedListening) {
      speech.stop();
    }
  }

  function onMicPointerCancel() {
    pressRef.current = null;
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = input;
    setInput('');
    await sendUserMessage(text, projectContext);
  }

  const scope = projectContext
    ? `Scoped to ${projectContext.project.name}`
    : 'Tous les projets';

  const configured = isOpenRouterConfigured();

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-label="Assistant IA">
        <div className={styles.grabber} aria-hidden />
        <header className={styles.header}>
          <span className={styles.avatar}>
            <Sparkles size={18} strokeWidth={1.5} />
          </span>
          <div className={styles.headerText}>
            <span className={styles.title}>Assistant</span>
            <span className={styles.scope}>{scope}</span>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className={styles.messages} ref={listRef}>
          {messages.length === 0 && (
            <div className={styles.empty}>
              {!configured && (
                <p>
                  Configure <code>VITE_OPENROUTER_API_KEY</code> dans <code>.env</code>{' '}
                  pour activer l'assistant.
                </p>
              )}
              <p>Quelques pistes pour commencer :</p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => void sendUserMessage(s, projectContext)}
                    disabled={!configured}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`${styles.bubble} ${
                m.role === 'user' ? styles.user : styles.assistant
              }`}
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <span className={styles.typing}>
              <span className="spinner" aria-hidden /> L'assistant réfléchit…
            </span>
          )}
          {error && <span className={styles.error}>{error}</span>}
        </div>

        <form className={styles.inputBar} onSubmit={submit}>
          <input
            className={styles.input}
            placeholder={
              speech.listening
                ? 'Écoute…'
                : projectContext
                ? 'Poser une question sur ce projet…'
                : 'Poser une question…'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!configured || loading}
          />
          <button
            type="button"
            className={`${styles.mic} ${speech.listening ? styles.micActive : ''}`}
            onPointerDown={onMicPointerDown}
            onPointerUp={onMicPointerUp}
            onPointerCancel={onMicPointerCancel}
            disabled={!configured || loading || !speech.supported}
            title={
              speech.supported
                ? speech.listening
                  ? 'Relâcher pour arrêter · tap pour basculer'
                  : 'Maintenir ou tap pour dicter'
                : 'Reconnaissance vocale non supportée par ce navigateur'
            }
            aria-label={speech.listening ? 'Arrêter la dictée' : 'Dicter'}
          >
            <Mic size={16} strokeWidth={1.8} />
          </button>
          <button
            type="submit"
            className={`${styles.send} ${loading ? styles.sendLoading : ''}`}
            disabled={!configured || loading || !input.trim()}
            aria-label="Envoyer"
          >
            <span className={styles.sendIcon}>
              <ArrowUp size={18} strokeWidth={1.8} />
            </span>
          </button>
        </form>
      </aside>
    </>
  );
}
