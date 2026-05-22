import { useState } from 'react';
import { GITHUB_REPO } from '../config';

type Stage = 'closed' | 'open' | 'sent';

export default function FeedbackWidget() {
  const [stage, setStage] = useState<Stage>('closed');
  const [body, setBody] = useState('');

  function submit() {
    if (!body.trim()) return;
    const title = 'Feedback';
    const fullBody = body.trim();
    if (GITHUB_REPO) {
      const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(fullBody)}`;
      window.open(url, '_blank', 'noopener');
    }
    setStage('sent');
    setBody('');
  }

  if (stage === 'sent') {
    return (
      <div className="feedback-bubble" onClick={() => setStage('closed')} title="Close">
        ✓
      </div>
    );
  }

  return (
    <>
      <button
        className="feedback-bubble"
        onClick={() => setStage(s => s === 'open' ? 'closed' : 'open')}
        title="Send feedback"
        aria-label="Send feedback"
      >
        {stage === 'open' ? '✕' : '💬'}
      </button>

      {stage === 'open' && (
        <div className="feedback-panel">
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
        </div>
      )}
    </>
  );
}
