import React, { useState } from 'react';
import { Languages, Sparkles, ChevronDown, X, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { translateText, summarizeDiscussion, AI_LANGUAGES } from '../../services/ai';
import type { DiscussionContent } from '../../services/ai';
import styles from './AITools.module.scss';

// ── Translate button ────────────────────────────────────────────────────────

interface TranslateButtonProps {
  text: string;
}

export const TranslateButton: React.FC<TranslateButtonProps> = ({ text }) => {
  const apiKey = useAppSelector((s) => s.user.profile?.openaiApiKey);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const handleTranslate = async (_langCode: string, langLabel: string) => {
    if (!apiKey) return;
    setSelectedLang(langLabel);
    setOpen(false);
    setLoading(true);
    try {
      const result = await translateText(apiKey, text, langLabel);
      setTranslated(result);
    } catch {
      setTranslated('Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setTranslated(null);
    setSelectedLang(null);
  };

  if (!apiKey) {
    return (
      <button
        className={styles.toolButton}
        onClick={() => navigate('/identity/profile')}
        title="Add an API key in your profile to enable translation"
      >
        <Languages size={14} />
        <span>Translate</span>
        <Key size={10} className={styles.keyHint} />
      </button>
    );
  }

  return (
    <div className={styles.translateWrapper}>
      <button className={styles.toolButton} onClick={() => setOpen(!open)}>
        <Languages size={14} />
        <span>Translate</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className={styles.langMenu}>
          {AI_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={styles.langItem}
              onClick={() => handleTranslate(lang.code, lang.label)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className={styles.aiResult}>
          <div className={styles.aiLoading}>Translating to {selectedLang}...</div>
        </div>
      )}

      {translated && !loading && (
        <div className={styles.aiResult}>
          <div className={styles.aiResultHeader}>
            <span className={styles.aiResultLabel}>
              <Languages size={12} /> {selectedLang}
            </span>
            <button className={styles.aiDismiss} onClick={handleDismiss}>
              <X size={12} />
            </button>
          </div>
          <p className={styles.aiResultText}>{translated}</p>
        </div>
      )}
    </div>
  );
};

// ── Summary button ──────────────────────────────────────────────────────────

interface SummaryButtonProps {
  content: DiscussionContent;
}

export const SummaryButton: React.FC<SummaryButtonProps> = ({ content }) => {
  const apiKey = useAppSelector((s) => s.user.profile?.openaiApiKey);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleSummarize = async () => {
    if (!apiKey) {
      navigate('/identity/profile');
      return;
    }
    if (summary) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const result = await summarizeDiscussion(apiKey, content);
      setSummary(result);
    } catch {
      setSummary('Summary generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.summaryWrapper}>
      <button className={styles.toolButton} onClick={handleSummarize}>
        <Sparkles size={14} />
        <span>{summary ? 'Hide Summary' : 'AI Summary'}</span>
        {!apiKey && <Key size={10} className={styles.keyHint} />}
      </button>

      {loading && (
        <div className={styles.aiResult}>
          <div className={styles.aiLoading}>Generating summary...</div>
        </div>
      )}

      {summary && !loading && (
        <div className={styles.aiResult}>
          <div className={styles.aiResultHeader}>
            <span className={styles.aiResultLabel}>
              <Sparkles size={12} /> AI Summary
            </span>
            <button className={styles.aiDismiss} onClick={() => setSummary(null)}>
              <X size={12} />
            </button>
          </div>
          <p className={styles.aiResultText}>{summary}</p>
        </div>
      )}
    </div>
  );
};

// ── Combined toolbar ────────────────────────────────────────────────────────

interface AIToolbarProps {
  text?: string;
  discussionContent?: DiscussionContent;
}

const AIToolbar: React.FC<AIToolbarProps> = ({ text, discussionContent }) => {
  return (
    <div className={styles.toolbar}>
      {text && <TranslateButton text={text} />}
      {discussionContent && <SummaryButton content={discussionContent} />}
    </div>
  );
};

export default AIToolbar;
