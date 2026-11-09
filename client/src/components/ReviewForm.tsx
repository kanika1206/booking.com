import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError, type Booking } from '../lib/api';
import { ErrorNote, Icon, Select } from './ui';

const SCORES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => ({
  value: n,
  label: `${n} · ${n >= 9 ? 'Exceptional' : n >= 8 ? 'Very good' : n >= 7 ? 'Good' : n >= 5 ? 'Okay' : 'Poor'}`,
}));

/** Real review for a completed stay. The server checks the stay and allows one review per property. */
export function ReviewForm({ b }: { b: Booking }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(9);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const post = useMutation({
    mutationFn: () => api.postReview(b.property.id, { rating, title, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', b.property.id] }),
  });
  const already = post.error instanceof ApiError && post.error.status === 409;

  if (post.isSuccess || already) {
    return (
      <section className="card row" role="status">
        <span className="icon-tile t-ok"><Icon name="check" /></span>
        <div><div className="h4">{already ? 'You’ve already reviewed this stay' : 'Thanks, your review is live'}</div>
          <div className="s muted">{already ? 'Each guest can leave one review per property.' : `It now counts towards ${b.property.name}’s score.`}</div></div>
      </section>
    );
  }
  return (
    <form className="card stack md" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
      <div>
        <h3 className="h4">How was {b.property.name}?</h3>
        <p className="s muted">Reviews come only from guests who completed a stay, so yours carries weight.</p>
      </div>
      <div className="grid-2">
        <div className="field">Your score<Select label="Score" icon="star" value={rating} onChange={setRating} options={SCORES} /></div>
        <label className="field">Title<span className="input"><input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sum it up in a few words" /></span></label>
      </div>
      <label className="field">Your review
        <textarea required maxLength={2000} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What stood out? What could be better?" style={{ padding: 14, resize: 'vertical' }} />
      </label>
      {post.error && !already && <ErrorNote error={post.error} />}
      <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={post.isPending}>{post.isPending ? 'Posting…' : 'Post review'}</button>
    </form>
  );
}
