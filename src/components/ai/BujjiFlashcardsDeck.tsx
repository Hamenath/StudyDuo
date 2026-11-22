import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, RotateCw, Shuffle } from 'lucide-react';
import type { BujjiFlashcard } from '../../types/bujji';

interface BujjiFlashcardsDeckProps {
  cards: BujjiFlashcard[];
}

export const BujjiFlashcardsDeck: React.FC<BujjiFlashcardsDeckProps> = ({ cards }) => {
  const [deck, setDeck] = useState<BujjiFlashcard[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  React.useEffect(() => {
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  if (!deck.length) return null;

  const current = deck[Math.min(index, deck.length - 1)];

  const handleNext = () => {
    setFlipped(false);
    setIndex((prev) => (prev + 1) % deck.length);
  };

  const handlePrev = () => {
    setFlipped(false);
    setIndex((prev) => (prev - 1 + deck.length) % deck.length);
  };

  const handleShuffle = () => {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeck(copy);
    setIndex(0);
    setFlipped(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E9DFFF] px-3 py-1 text-xs font-extrabold text-[#7651E8]">
            <Layers className="h-3.5 w-3.5" />
            Flashcards ({index + 1}/{deck.length})
          </span>
          {current.tag && (
            <span className="rounded-full bg-[#FFF0C9] px-2.5 py-0.5 text-[11px] font-bold text-[#8A5A00]">
              {current.tag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1 rounded-full border border-[#F0EDF5] bg-white px-3 py-1.5 text-xs font-bold text-[#5C5C6C] hover:bg-[#F8F5FF] cursor-pointer"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-[#F0EDF5] bg-white px-3 py-1.5 text-xs font-bold text-[#5C5C6C] hover:bg-[#F8F5FF] cursor-pointer"
          >
            {showGrid ? 'Card View' : 'All Cards'}
          </button>
        </div>
      </div>

      {!showGrid ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? 'Show question front' : 'Reveal flashcard answer'}
            className={`w-full min-h-[170px] rounded-[24px] border-2 p-6 text-left transition-all cursor-pointer flex flex-col justify-between gap-4 ${
              flipped
                ? 'border-[#9AD9B5] bg-[#E2F5E9]'
                : 'border-[#DDD0FF] bg-[#F8F5FF] hover:bg-[#F2ECFF]'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider">
              <span className={flipped ? 'text-[#1F874D]' : 'text-[#7651E8]'}>
                {flipped ? 'Answer' : 'Question / Prompt'}
              </span>
              <span className="inline-flex items-center gap-1 text-[#777783]">
                <RotateCw className="h-3 w-3" />
                Tap to flip
              </span>
            </div>

            <p className="font-display text-base sm:text-lg font-extrabold text-[#20202A] leading-snug">
              {flipped ? current.back : current.front}
            </p>

            <p className="text-[11px] font-semibold text-[#777783]">
              {flipped ? 'Click again to test yourself' : 'Recall the answer before flipping'}
            </p>
          </button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#F0EDF5] bg-white px-4 text-xs font-bold text-[#20202A] hover:bg-[#F8F5FF] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-1.5">
              {deck.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={`Go to card ${i + 1}`}
                  onClick={() => {
                    setIndex(i);
                    setFlipped(false);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === index ? 'w-5 bg-[#7651E8]' : 'w-2 bg-[#DDD0FF]'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#7651E8] px-4 text-xs font-bold text-white hover:bg-[#6440D6] cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {deck.map((card, i) => (
            <div
              key={card.id}
              className="rounded-2xl border border-[#F0EDF5] bg-[#F8F5FF] p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#7651E8]">
                <span>Card {i + 1}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[#5C5C6C]">{card.tag}</span>
              </div>
              <p className="text-sm font-extrabold text-[#20202A]">{card.front}</p>
              <p className="text-xs text-[#4C4B5C] border-t border-[#E9DFFF] pt-2 leading-relaxed">
                {card.back}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
