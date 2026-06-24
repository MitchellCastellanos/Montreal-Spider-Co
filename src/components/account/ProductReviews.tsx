"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { dict } = useI18n();
  const a = dict.account;
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string; name: string }[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch(`/api/account/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d: { reviews?: typeof reviews; canReview?: boolean; mine?: { rating: number; comment: string } }) => {
        setReviews(d.reviews ?? []);
        setCanReview(Boolean(d.canReview));
        if (d.mine) {
          setRating(d.mine.rating);
          setComment(d.mine.comment);
          setSaved(true);
        }
      })
      .catch(() => {});
  }, [productId]);

  const submit = async () => {
    if (!user || !canReview) return;
    const res = await fetch("/api/account/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, comment }),
    });
    if (res.ok) {
      setSaved(true);
      const d = (await fetch(`/api/account/reviews?productId=${productId}`).then((r) => r.json())) as {
        reviews?: typeof reviews;
      };
      setReviews(d.reviews ?? []);
    }
  };

  return (
    <section className="mt-12 border-t border-line pt-10">
      <h2 className="mb-4 font-display text-2xl font-bold text-cream">{a.reviewsTitle}</h2>
      {reviews.length === 0 && <p className="text-sm text-bone">{a.noReviews}</p>}
      <ul className="mb-6 space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="card-glow rounded-xl p-4">
            <p className="text-gold-bright">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
            <p className="mt-1 text-sm text-bone">{r.comment || "—"}</p>
            <p className="mt-1 text-xs text-muted">— {r.name}</p>
          </li>
        ))}
      </ul>
      {user && canReview && (
        <div className="card-glow max-w-lg space-y-3 rounded-xl p-4">
          <p className="text-sm font-medium text-cream">{saved ? a.reviewEdit : a.reviewWrite}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="text-xl text-gold-bright">
                {n <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          <textarea
            className="input min-h-24"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={a.reviewPlaceholder}
          />
          <button type="button" onClick={() => void submit()} className="btn btn-gold">
            {dict.common.save}
          </button>
        </div>
      )}
    </section>
  );
}
