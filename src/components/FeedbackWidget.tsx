import { useState } from 'react';
import { GITHUB_REPO } from '../config';

type Stage = 'idle' | 'sent';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackWidget({ open, onOpenChange }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [body, setBody] = useState('');

  function submit() {
    if (!body.trim()) return;
    if (GITHUB_REPO) {
      const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent('Feedback')}&body=${encodeURIComponent(body.trim())}`;
      window.open(url, '_blank', 'noopener');
    }
    setStage('sent');
    setBody('');
  }

  function close() {
    onOpenChange(false);
    setStage('idle');
  }

  return (
    <>
      <button
        className="feedback-bubble"
        onClick={() => onOpenChange(!open)}
        title="Send feedback"
        aria-label="Send feedback"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="feedback-panel">
          {stage === 'sent' ? (
            <p className="feedback-title" style={{ textAlign: 'center' }}>Thanks! ✓</p>
          ) : (
            <>
              <p className="feedback-title">Send feedback</p>
              <textarea
                className="feedback-textarea"
                placeholder="Bug, suggestion, or anything else…"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                autoFocus
              />
              <button
                className="feedback-submit"
                onClick={submit}
                disabled={!body.trim() || !GITHUB_REPO}
              >
                {GITHUB_REPO ? 'Open GitHub issue →' : 'VITE_GITHUB_REPO not set'}
              </button>
            </>
          )}
          <button className="feedback-close" onClick={close}>Close</button>
        </div>
      )}
    </>
  );
}
