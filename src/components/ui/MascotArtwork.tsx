import React, { useState } from 'react';
import brainHeroImg from '../../assets/images/mascot_brain_hero_1795368527250.jpg';
import scienceAlienImg from '../../assets/images/mascot_science_alien_1795368527039.jpg';
import languageScholarImg from '../../assets/images/mascot_language_scholar_1795368527063.jpg';
import codingBuddyImg from '../../assets/images/mascot_coding_buddy_1795368528103.jpg';
import mathOwlImg from '../../assets/images/mascot_math_owl_1795368527189.jpg';

export type MascotKey = 'brain' | 'science' | 'language' | 'coding' | 'owl';

export interface SubjectPastelTheme {
  id: 'lavender' | 'yellow' | 'green' | 'pink';
  label: string;
  cardBg: string;
  progressFill: string;
  statusText: string;
  accentIconColor: string;
  mascot: MascotKey;
}

const MASCOT_SOURCES: Record<MascotKey, { src: string; bg: string; emoji: string; alt: string }> = {
  brain: {
    src: brainHeroImg,
    bg: '#E9DFFF',
    emoji: '🧠',
    alt: 'Friendly StudyDuo brain mascot sitting on colorful books',
  },
  science: {
    src: scienceAlienImg,
    bg: '#E9DFFF',
    emoji: '🛸',
    alt: 'Friendly pastel green alien learning mascot waving hello',
  },
  language: {
    src: languageScholarImg,
    bg: '#FFF0C9',
    emoji: '📚',
    alt: 'Cheerful yellow cartoon study buddy wearing glasses and holding a storybook',
  },
  coding: {
    src: codingBuddyImg,
    bg: '#E2F5E9',
    emoji: '💻',
    alt: 'Friendly mint robot owl coding mascot with headphones and laptop',
  },
  owl: {
    src: mathOwlImg,
    bg: '#FFE8F0',
    emoji: '🦉',
    alt: 'Cute purple scholar owl wearing a graduation cap and holding a gold star',
  },
};

export const SUBJECT_THEMES: Record<'lavender' | 'yellow' | 'green' | 'pink', SubjectPastelTheme> = {
  lavender: {
    id: 'lavender',
    label: 'Science',
    cardBg: '#E9DFFF',
    progressFill: '#7651E8',
    statusText: '#6842DE',
    accentIconColor: '#C5B0FF',
    mascot: 'science',
  },
  yellow: {
    id: 'yellow',
    label: 'Languages',
    cardBg: '#FFF0C9',
    progressFill: '#E59A18',
    statusText: '#B47100',
    accentIconColor: '#F3D283',
    mascot: 'language',
  },
  green: {
    id: 'green',
    label: 'Programming',
    cardBg: '#E2F5E9',
    progressFill: '#2FB368',
    statusText: '#1F874D',
    accentIconColor: '#A8DEC0',
    mascot: 'coding',
  },
  pink: {
    id: 'pink',
    label: 'Mathematics',
    cardBg: '#FFE8F0',
    progressFill: '#E05288',
    statusText: '#BE3469',
    accentIconColor: '#F7BDD2',
    mascot: 'owl',
  },
};

export function getSubjectTheme(category?: string, fallbackIndex = 0): SubjectPastelTheme {
  const normalized = (category || '').toLowerCase();
  if (normalized.includes('science') || normalized.includes('ai') || normalized.includes('data')) {
    return SUBJECT_THEMES.lavender;
  }
  if (normalized.includes('language') || normalized.includes('english') || normalized.includes('business') || normalized.includes('writing')) {
    return SUBJECT_THEMES.yellow;
  }
  if (normalized.includes('program') || normalized.includes('python') || normalized.includes('code') || normalized.includes('cloud') || normalized.includes('dev')) {
    return SUBJECT_THEMES.green;
  }
  if (normalized.includes('math') || normalized.includes('design') || normalized.includes('exam') || normalized.includes('ux')) {
    return SUBJECT_THEMES.pink;
  }
  const order: SubjectPastelTheme[] = [
    SUBJECT_THEMES.lavender,
    SUBJECT_THEMES.yellow,
    SUBJECT_THEMES.green,
    SUBJECT_THEMES.pink,
  ];
  return order[Math.abs(fallbackIndex) % order.length];
}

export const MascotImage: React.FC<{
  mascot: MascotKey;
  alt?: string;
  className?: string;
  rounded?: string;
  seamless?: boolean;
}> = ({ mascot, alt, className = 'h-24 w-24', rounded = 'rounded-2xl', seamless = true }) => {
  const [failed, setFailed] = useState(false);
  const meta = MASCOT_SOURCES[mascot];

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || meta.alt}
        style={{ backgroundColor: meta.bg }}
        className={`flex items-center justify-center ${rounded} ${className} select-none`}
      >
        <span className="text-3xl" aria-hidden="true">
          {meta.emoji}
        </span>
      </div>
    );
  }

  return (
    <img
      src={meta.src}
      alt={alt || meta.alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover select-none ${seamless ? 'mascot-seamless' : rounded} ${className}`}
    />
  );
};

/** Subtle pastel decorative motif for the right corner of pastel subject cards (matches reference screenshot). */
export const SubjectCardMotif: React.FC<{ themeId: SubjectPastelTheme['id'] }> = ({ themeId }) => {
  if (themeId === 'lavender') {
    return (
      <svg viewBox="0 0 80 80" className="h-16 w-16 opacity-75 pointer-events-none select-none" aria-hidden="true">
        <circle cx="40" cy="40" r="19" fill="#B699FF" />
        <ellipse
          cx="40"
          cy="40"
          rx="33"
          ry="10"
          transform="rotate(-22 40 40)"
          fill="none"
          stroke="#9572F5"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="33" cy="34" r="4" fill="#D4C2FF" />
        <circle cx="48" cy="45" r="2.5" fill="#9E7DF5" />
      </svg>
    );
  }
  if (themeId === 'yellow') {
    return (
      <svg viewBox="0 0 84 72" className="h-14 w-16 opacity-80 pointer-events-none select-none" aria-hidden="true">
        <text x="8" y="34" fill="#F0C76B" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="28">
          A
        </text>
        <text x="34" y="54" fill="#EBB84D" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="22">
          b
        </text>
        <text x="52" y="36" fill="#F0C76B" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="26">
          C
        </text>
      </svg>
    );
  }
  if (themeId === 'green') {
    return (
      <svg viewBox="0 0 84 72" className="h-14 w-16 opacity-80 pointer-events-none select-none" aria-hidden="true">
        <path
          d="M28 22 L12 36 L28 50"
          fill="none"
          stroke="#8AD6AA"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M56 22 L72 36 L56 50"
          fill="none"
          stroke="#8AD6AA"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="46" y1="18" x2="38" y2="54" stroke="#6BC492" strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className="h-16 w-16 opacity-80 pointer-events-none select-none" aria-hidden="true">
      <path
        d="M42 14 L47 29 L62 31 L50 41 L54 56 L42 48 L30 56 L34 41 L22 31 L37 29 Z"
        fill="#F4A5C2"
      />
      <circle cx="18" cy="54" r="6" fill="#F8C2D6" />
      <circle cx="62" cy="18" r="4" fill="#F4A5C2" />
    </svg>
  );
};

import owlDuoMasterImg from '../../assets/images/studyduo-owl-duo-master.png';

export { owlDuoMasterImg };

/** Cute StudyDuo Owl Brand Mark directly rendered using the brand kit paired owl mascots with open book & gold star. */
export const StudyDuoOwlMark: React.FC<{ size?: number; className?: string }> = ({ size = 34, className = '' }) => (
  <img
    src={owlDuoMasterImg}
    alt="StudyDuo Mascot"
    width={size}
    height={size}
    className={`shrink-0 object-contain rounded-xl select-none ${className}`}
    style={{ width: `${size}px`, height: `${size}px` }}
  />
);
