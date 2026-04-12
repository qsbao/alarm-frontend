import { Send } from 'lucide-react';
import { useState } from 'react';

interface CommentBoxProps {
  onPost: (text: string) => Promise<void> | void;
}

export function CommentBox({ onPost }: CommentBoxProps) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      await onPost(trimmed);
      setText('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-muted mb-3">
        Add comment
      </h2>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Leave a note for your team..."
        className="input-base resize-none"
        disabled={posting}
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={posting || !text.trim()}
          className="btn-primary btn-sm"
        >
          <Send size={13} />
          Post comment
        </button>
      </div>
    </div>
  );
}
