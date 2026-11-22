import React, { useId } from 'react';
import {
  DEFAULT_AVATAR_CONFIG,
  sanitizeAvatarConfig,
  type AvatarConfig,
} from '../../lib/avatarCatalog';

const SKIN_MAP: Record<string, { base: string; shadow: string; blush: string }> = {
  porcelain: { base: '#FCE5D8', shadow: '#E8C5B2', blush: '#F4A6A6' },
  warm_ivory: { base: '#F5CFAF', shadow: '#DEB18C', blush: '#EC9D96' },
  golden_sand: { base: '#E2B086', shadow: '#C89265', blush: '#DF8B82' },
  caramel: { base: '#C68A5C', shadow: '#A86D43', blush: '#C9756C' },
  chestnut: { base: '#965E3D', shadow: '#79482B', blush: '#A85C52' },
  espresso: { base: '#6A3E27', shadow: '#512C1A', blush: '#8A4842' },
};

const HAIR_COLOR_MAP: Record<string, { main: string; hi: string; deep: string }> = {
  ink_black: { main: '#25243A', hi: '#413F63', deep: '#171626' },
  cocoa_brown: { main: '#5B3A29', hi: '#7B523C', deep: '#3E261A' },
  warm_auburn: { main: '#9A4632', hi: '#BC5F47', deep: '#743122' },
  honey_blonde: { main: '#D8A657', hi: '#EFC67E', deep: '#B3833A' },
  silver_mist: { main: '#9DA3B8', hi: '#C2C8DA', deep: '#767C92' },
  royal_violet: { main: '#7956E8', hi: '#A78BFA', deep: '#5535BE' },
  arctic_cyan: { main: '#31AFC4', hi: '#6ED9EA', deep: '#1E8294' },
};

const OUTFIT_COLOR_MAP: Record<string, { main: string; accent: string; deep: string }> = {
  primary_purple: { main: '#7956E8', accent: '#A78BFA', deep: '#5A3BC2' },
  cyan_pulse: { main: '#38B2C6', accent: '#9EE8F3', deep: '#24899C' },
  emerald_leaf: { main: '#38B982', accent: '#8BE6BF', deep: '#248D60' },
  slate_indigo: { main: '#3B3A5A', accent: '#75749D', deep: '#27263D' },
  coral_bloom: { main: '#EB6B80', accent: '#FAB1BD', deep: '#C24A5F' },
  sunlit_gold: { main: '#EAA828', accent: '#FFE08A', deep: '#C28212' },
};

const BG_MAP: Record<string, { from: string; to: string; pattern: string }> = {
  soft_lavender: { from: '#F4F0FF', to: '#DFD6FF', pattern: '#A78BFA' },
  sky_cyan: { from: '#ECFAFD', to: '#C5EFF7', pattern: '#45C4D8' },
  mint_breeze: { from: '#EBFAF3', to: '#C4F0DC', pattern: '#38B982' },
  warm_gold: { from: '#FFF9E8', to: '#FFE39E', pattern: '#FFC857' },
  violet_aura: { from: '#EDE7FF', to: '#C4B1FF', pattern: '#7956E8' },
  solar_burst: { from: '#FFF5D6', to: '#FFD370', pattern: '#F59E0B' },
};

export interface PlayerAvatarProps {
  config?: AvatarConfig | null;
  seedKey?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'studio';
  animated?: boolean;
  className?: string;
  alt?: string;
}

const SIZE_CLASS: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
  studio: 'h-40 w-40 sm:h-48 sm:w-48',
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  config,
  seedKey,
  size = 'md',
  animated = false,
  className = '',
  alt = 'Player avatar',
}) => {
  const uid = useId().replace(/:/g, '');
  const resolved: AvatarConfig = config
    ? sanitizeAvatarConfig(config, seedKey)
    : sanitizeAvatarConfig(DEFAULT_AVATAR_CONFIG, seedKey);

  const skin = SKIN_MAP[resolved.skinTone] ?? SKIN_MAP.warm_ivory;
  const hair = HAIR_COLOR_MAP[resolved.hairColor] ?? HAIR_COLOR_MAP.ink_black;
  const outfit = OUTFIT_COLOR_MAP[resolved.outfitColor] ?? OUTFIT_COLOR_MAP.primary_purple;
  const bg = BG_MAP[resolved.background] ?? BG_MAP.soft_lavender;

  const clipId = `av-clip-${uid}`;
  const bgGradId = `av-bg-${uid}`;
  const frameGradId = `av-frame-${uid}`;

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${SIZE_CLASS[size]} ${className}`}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="60" cy="60" r="54" />
          </clipPath>
          <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bg.from} />
            <stop offset="100%" stopColor={bg.to} />
          </linearGradient>
          <linearGradient id={frameGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7956E8" />
            <stop offset="50%" stopColor="#45C4D8" />
            <stop offset="100%" stopColor="#FFC857" />
          </linearGradient>
        </defs>

        {/* Backdrop Circle */}
        <circle cx="60" cy="60" r="54" fill={`url(#${bgGradId})`} />

        {/* Clipped Character Composition */}
        <g clipPath={`url(#${clipId})`}>
          {/* Subtle Backdrop Motifs */}
          {resolved.background === 'solar_burst' && (
            <g opacity="0.28" fill={bg.pattern}>
              <polygon points="60,60 52,0 68,0" />
              <polygon points="60,60 120,24 120,42" />
              <polygon points="60,60 0,24 0,42" />
              <polygon points="60,60 112,96 96,112" />
              <polygon points="60,60 8,96 24,112" />
            </g>
          )}
          {resolved.background === 'violet_aura' && (
            <g opacity="0.22">
              <circle cx="60" cy="54" r="38" fill="none" stroke="#7956E8" strokeWidth="2" strokeDasharray="5 5" />
              <circle cx="24" cy="28" r="3" fill="#7956E8" />
              <circle cx="96" cy="30" r="2.5" fill="#45C4D8" />
              <circle cx="92" cy="82" r="2" fill="#FFC857" />
            </g>
          )}
          {resolved.background !== 'solar_burst' && resolved.background !== 'violet_aura' && (
            <g opacity="0.22" fill={bg.pattern}>
              <circle cx="24" cy="26" r="10" />
              <circle cx="98" cy="32" r="7" />
            </g>
          )}

          {/* Optional Idle Character Group */}
          <g className={animated ? 'sd-avatar-idle' : undefined}>
            {/* Back Hair Layer (for long / wavy / puff) */}
            {resolved.hairStyle === 'long_flow' && (
              <path
                d="M28 54 C25 78 24 102 32 114 L88 114 C96 102 95 78 92 54 C91 30 78 22 60 22 C42 22 29 30 28 54 Z"
                fill={hair.deep}
              />
            )}
            {resolved.hairStyle === 'wavy_bob' && (
              <path
                d="M29 52 C26 68 27 80 35 88 L85 88 C93 80 94 68 91 52 C90 31 77 22 60 22 C43 22 30 31 29 52 Z"
                fill={hair.deep}
              />
            )}
            {resolved.hairStyle === 'curly_puff' && (
              <g fill={hair.main}>
                <circle cx="34" cy="40" r="14" />
                <circle cx="86" cy="40" r="14" />
                <circle cx="46" cy="26" r="14" />
                <circle cx="74" cy="26" r="14" />
                <circle cx="60" cy="22" r="15" />
                <circle cx="31" cy="54" r="11" />
                <circle cx="89" cy="54" r="11" />
              </g>
            )}
            {resolved.hairStyle === 'sleek_bun' && (
              <g>
                <circle cx="60" cy="20" r="13" fill={hair.main} />
                <path d="M51 26 Q60 22 69 26" stroke="#A78BFA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </g>
            )}

            {/* Golden Wings Accessory (behind torso) */}
            {resolved.accessory === 'laurel_wings' && (
              <g>
                <path d="M22 94 C10 82 12 68 26 74 C16 74 16 84 28 88 Z" fill="#FFC857" stroke="#E09E1B" strokeWidth="1" />
                <path d="M98 94 C110 82 108 68 94 74 C104 74 104 84 92 88 Z" fill="#FFC857" stroke="#E09E1B" strokeWidth="1" />
              </g>
            )}

            {/* Torso / Outfit */}
            <g>
              {resolved.outfit === 'champion_cape' && (
                <path d="M18 118 L28 84 Q60 76 92 84 L102 118 Z" fill={outfit.deep} />
              )}
              <path
                d="M24 120 C26 94 38 84 60 84 C82 84 94 94 96 120 Z"
                fill={outfit.main}
              />
              {/* Outfit specific detailing */}
              {resolved.outfit === 'cozy_hoodie' && (
                <g>
                  <path d="M42 86 Q60 98 78 86" fill="none" stroke={outfit.deep} strokeWidth="4" strokeLinecap="round" />
                  <line x1="52" y1="92" x2="52" y2="108" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                  <line x1="68" y1="92" x2="68" y2="108" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                </g>
              )}
              {resolved.outfit === 'crew_tee' && (
                <path d="M47 85 Q60 95 73 85" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              )}
              {resolved.outfit === 'knit_sweater' && (
                <g opacity="0.45" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
                  <path d="M36 98 L44 103 L52 98 L60 103 L68 98 L76 103 L84 98" fill="none" />
                  <path d="M34 107 L42 112 L50 107 L58 112 L66 107 L74 112 L82 107" fill="none" />
                </g>
              )}
              {resolved.outfit === 'varsity_jacket' && (
                <g>
                  <path d="M24 120 C26 98 33 90 42 86 L40 120 Z" fill="#FFFFFF" opacity="0.92" />
                  <path d="M96 120 C94 98 87 90 78 86 L80 120 Z" fill="#FFFFFF" opacity="0.92" />
                  <line x1="60" y1="88" x2="60" y2="120" stroke={outfit.deep} strokeWidth="2" />
                  <circle cx="52" cy="99" r="3.5" fill="#FFC857" />
                </g>
              )}
              {resolved.outfit === 'studio_blazer' && (
                <g>
                  <polygon points="48,85 60,104 72,85" fill="#FFFFFF" />
                  <polygon points="46,85 56,104 42,102" fill={outfit.deep} />
                  <polygon points="74,85 64,104 78,102" fill={outfit.deep} />
                  <line x1="60" y1="90" x2="60" y2="103" stroke={outfit.accent} strokeWidth="2.5" strokeLinecap="round" />
                </g>
              )}
              {resolved.outfit === 'champion_cape' && (
                <g>
                  <path d="M40 87 Q60 97 80 87" fill="none" stroke="#FFC857" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="43" cy="90" r="3" fill="#FFC857" />
                  <circle cx="77" cy="90" r="3" fill="#FFC857" />
                </g>
              )}
            </g>

            {/* Neck */}
            <rect x="52" y="74" width="16" height="15" rx="7" fill={skin.shadow} />

            {/* Accessories on Neck / Chest */}
            {resolved.accessory === 'cozy_scarf' && (
              <g>
                <rect x="40" y="81" width="40" height="10" rx="5" fill="#A78BFA" />
                <path d="M68 86 L74 106 L64 106 L61 88 Z" fill="#8B6DF5" />
                <line x1="45" y1="86" x2="75" y2="86" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
              </g>
            )}
            {resolved.accessory === 'duo_lanyard' && (
              <g>
                <path d="M49 85 L60 103 L71 85" fill="none" stroke="#45C4D8" strokeWidth="2.5" />
                <rect x="55" y="101" width="10" height="12" rx="2.5" fill="#FFFFFF" stroke="#45C4D8" strokeWidth="1.5" />
                <circle cx="60" cy="106" r="2" fill="#7956E8" />
              </g>
            )}
            {resolved.accessory === 'star_pin' && (
              <polygon
                points="73,94 74.6,97.4 78.4,97.9 75.6,100.5 76.3,104.2 73,102.4 69.7,104.2 70.4,100.5 67.6,97.9 71.4,97.4"
                fill="#FFC857"
                stroke="#FFFFFF"
                strokeWidth="0.9"
              />
            )}
            {resolved.accessory === 'flame_badge' && (
              <path
                d="M73 93 C76 96 77 99 75.5 102.5 C74 104.5 71 104.5 69.8 102 C68.8 100 69.8 97.5 71.2 96.5 C71 98.2 72.2 98.5 72.8 97 C73.3 95.8 72.8 94.3 73 93 Z"
                fill="#FFC857"
                stroke="#F59E0B"
                strokeWidth="1"
              />
            )}

            {/* Ears */}
            <circle cx="34" cy="57" r="5.5" fill={skin.shadow} />
            <circle cx="86" cy="57" r="5.5" fill={skin.shadow} />

            {/* Head */}
            <rect x="35" y="29" width="50" height="51" rx="24" fill={skin.base} />

            {/* Soft Cheek Blush */}
            <ellipse cx="44" cy="63" rx="4.8" ry="2.6" fill={skin.blush} opacity="0.32" />
            <ellipse cx="76" cy="63" rx="4.8" ry="2.6" fill={skin.blush} opacity="0.32" />

            {/* Eyes & Eyebrows */}
            <g>
              {/* Eyebrows */}
              {resolved.eyeStyle === 'determined' ? (
                <>
                  <path d="M44 47 L53 49" stroke={hair.deep} strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M76 47 L67 49" stroke={hair.deep} strokeWidth="2.2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M44 47 Q49 44.5 54 47" stroke={hair.deep} strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M66 47 Q71 44.5 76 47" stroke={hair.deep} strokeWidth="2" fill="none" strokeLinecap="round" />
                </>
              )}

              {/* Left Eye */}
              {resolved.eyeStyle === 'happy_arcs' ? (
                <path d="M45 55 Q49 50.5 53 55" stroke="#25243A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : resolved.eyeStyle === 'calm_almond' ? (
                <g>
                  <ellipse cx="49" cy="55" rx="3.8" ry="2.7" fill="#25243A" />
                  <circle cx="50.3" cy="54" r="1.1" fill="#FFFFFF" />
                </g>
              ) : resolved.eyeStyle === 'sparkle_eyes' ? (
                <g>
                  <circle cx="49" cy="55" r="3.8" fill="#25243A" />
                  <circle cx="50.4" cy="53.5" r="1.4" fill="#FFFFFF" />
                  <circle cx="47.8" cy="56.5" r="0.8" fill="#A78BFA" />
                </g>
              ) : (
                <g>
                  <circle cx="49" cy="55" r="3.4" fill="#25243A" />
                  <circle cx="50.2" cy="53.8" r="1.1" fill="#FFFFFF" />
                </g>
              )}

              {/* Right Eye (supports playful_wink faceStyle) */}
              {resolved.faceStyle === 'playful_wink' ? (
                <path d="M67 55 Q71 51.5 75 55" stroke="#25243A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : resolved.eyeStyle === 'happy_arcs' ? (
                <path d="M67 55 Q71 50.5 75 55" stroke="#25243A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              ) : resolved.eyeStyle === 'calm_almond' ? (
                <g>
                  <ellipse cx="71" cy="55" rx="3.8" ry="2.7" fill="#25243A" />
                  <circle cx="72.3" cy="54" r="1.1" fill="#FFFFFF" />
                </g>
              ) : resolved.eyeStyle === 'sparkle_eyes' ? (
                <g>
                  <circle cx="71" cy="55" r="3.8" fill="#25243A" />
                  <circle cx="72.4" cy="53.5" r="1.4" fill="#FFFFFF" />
                  <circle cx="69.8" cy="56.5" r="0.8" fill="#A78BFA" />
                </g>
              ) : (
                <g>
                  <circle cx="71" cy="55" r="3.4" fill="#25243A" />
                  <circle cx="72.2" cy="53.8" r="1.1" fill="#FFFFFF" />
                </g>
              )}
            </g>

            {/* Nose */}
            <path d="M59 58 Q60 61 61.5 60" stroke={skin.shadow} strokeWidth="1.6" fill="none" strokeLinecap="round" />

            {/* Mouth / Face Expression */}
            {resolved.faceStyle === 'warm_smile' && (
              <path d="M53 67 Q60 72.5 67 67" stroke="#25243A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            )}
            {resolved.faceStyle === 'cheerful' && (
              <path d="M52 66 Q60 75 68 66 Z" fill="#25243A" />
            )}
            {resolved.faceStyle === 'focused' && (
              <path d="M55 68 Q60 69.2 65 68" stroke="#25243A" strokeWidth="2.1" fill="none" strokeLinecap="round" />
            )}
            {resolved.faceStyle === 'confident' && (
              <path d="M54 68 Q61 71 67 65.5" stroke="#25243A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            )}
            {resolved.faceStyle === 'playful_wink' && (
              <path d="M53 66.5 Q60 73 67 66" stroke="#25243A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            )}
            {resolved.faceStyle === 'radiant_joy' && (
              <g>
                <path d="M51 65.5 Q60 76 69 65.5 Z" fill="#25243A" />
                <path d="M54 66.5 L66 66.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* Front Hair Layer */}
            {resolved.hairStyle === 'short_crop' && (
              <path
                d="M34 50 C33 32 45 23 60 23 C75 23 87 32 86 50 C83 41 75 37 60 37 C46 37 37 41 34 50 Z"
                fill={hair.main}
              />
            )}
            {resolved.hairStyle === 'side_part' && (
              <path
                d="M34 51 C33 31 45 22 61 22 C77 22 87 32 86 51 C82 40 73 36 56 35 C47 41 39 44 34 51 Z"
                fill={hair.main}
              />
            )}
            {resolved.hairStyle === 'messy_fringe' && (
              <path
                d="M33 50 C32 30 45 21 60 21 C76 21 88 30 87 50 L81 40 L74 44 L67 36 L58 43 L50 36 L43 44 L37 40 Z"
                fill={hair.main}
              />
            )}
            {resolved.hairStyle === 'spiky_hero' && (
              <path
                d="M33 49 L35 32 L44 35 L49 18 L59 29 L67 16 L73 30 L84 26 L86 49 C81 40 72 37 60 37 C48 37 39 40 33 49 Z"
                fill={hair.main}
              />
            )}
            {(resolved.hairStyle === 'wavy_bob' || resolved.hairStyle === 'long_flow') && (
              <path
                d="M33 52 C33 31 45 23 60 23 C75 23 87 31 87 52 C81 40 72 35 60 36 C48 35 39 40 33 52 Z"
                fill={hair.main}
              />
            )}
            {resolved.hairStyle === 'sleek_bun' && (
              <path
                d="M34 51 C34 32 45 24 60 24 C75 24 86 32 86 51 C81 41 72 37 60 37 C48 37 39 41 34 51 Z"
                fill={hair.main}
              />
            )}
            {resolved.hairStyle === 'curly_puff' && (
              <path
                d="M35 47 C38 35 48 31 60 31 C72 31 82 35 85 47 C79 40 70 38 60 38 C50 38 41 40 35 47 Z"
                fill={hair.hi}
              />
            )}

            {/* Glasses Layer */}
            {resolved.glasses === 'round_wire' && (
              <g stroke="#25243A" strokeWidth="2" fill="rgba(255,255,255,0.22)">
                <circle cx="49" cy="55" r="7.5" />
                <circle cx="71" cy="55" r="7.5" />
                <line x1="56.5" y1="55" x2="63.5" y2="55" />
              </g>
            )}
            {resolved.glasses === 'square_scholar' && (
              <g stroke="#3B3A5A" strokeWidth="2.2" fill="rgba(255,255,255,0.22)">
                <rect x="41" y="49" width="16" height="12" rx="3.5" />
                <rect x="63" y="49" width="16" height="12" rx="3.5" />
                <line x1="57" y1="54.5" x2="63" y2="54.5" />
              </g>
            )}
            {resolved.glasses === 'gold_rim' && (
              <g stroke="#D99B26" strokeWidth="2" fill="rgba(255,200,87,0.16)">
                <circle cx="49" cy="55" r="7.8" />
                <circle cx="71" cy="55" r="7.8" />
                <line x1="56.8" y1="54.5" x2="63.2" y2="54.5" />
              </g>
            )}
            {resolved.glasses === 'cyan_visor' && (
              <g>
                <rect
                  x="39"
                  y="49"
                  width="42"
                  height="12"
                  rx="6"
                  fill="rgba(69,196,216,0.42)"
                  stroke="#45C4D8"
                  strokeWidth="2"
                />
                <line x1="45" y1="53" x2="56" y2="53" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
              </g>
            )}

            {/* Hats / Headwear Layer */}
            {resolved.hat === 'knit_beanie' && (
              <g>
                <path d="M33 41 C35 22 46 16 60 16 C74 16 85 22 87 41 Z" fill="#7956E8" />
                <rect x="31" y="36" width="58" height="9" rx="4.5" fill="#5F3FD4" />
                <circle cx="60" cy="14" r="5" fill="#A78BFA" />
              </g>
            )}
            {resolved.hat === 'study_headphones' && (
              <g>
                <path d="M31 55 C31 28 43 18 60 18 C77 18 89 28 89 55" fill="none" stroke="#25243A" strokeWidth="4.5" strokeLinecap="round" />
                <rect x="27" y="48" width="8" height="17" rx="4" fill="#7956E8" stroke="#25243A" strokeWidth="1.5" />
                <rect x="85" y="48" width="8" height="17" rx="4" fill="#7956E8" stroke="#25243A" strokeWidth="1.5" />
              </g>
            )}
            {resolved.hat === 'baseball_cap' && (
              <g>
                <path d="M34 39 C36 22 46 18 60 18 C74 18 84 22 86 39 Z" fill="#45C4D8" />
                <path d="M32 38 Q60 33 94 40 Q78 44 32 41 Z" fill="#2A9FB3" />
                <circle cx="60" cy="27" r="3" fill="#FFFFFF" />
              </g>
            )}
            {resolved.hat === 'grad_cap' && (
              <g>
                <rect x="42" y="25" width="36" height="12" rx="3" fill="#25243A" />
                <polygon points="60,12 94,24 60,34 26,24" fill="#32304F" stroke="#25243A" strokeWidth="1.2" />
                <line x1="87" y1="26" x2="89" y2="41" stroke="#FFC857" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="89" cy="42" r="2.6" fill="#FFC857" />
              </g>
            )}
            {resolved.hat === 'golden_crown' && (
              <g>
                <polygon
                  points="40,34 43,17 52,26 60,13 68,26 77,17 80,34"
                  fill="#FFC857"
                  stroke="#D99416"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="60" cy="27" r="2.4" fill="#7956E8" />
                <circle cx="49" cy="29" r="1.8" fill="#45C4D8" />
                <circle cx="71" cy="29" r="1.8" fill="#45C4D8" />
              </g>
            )}
          </g>
        </g>

        {/* Outer Frame Layer */}
        {resolved.frame === 'none' && (
          <circle cx="60" cy="60" r="54" fill="none" stroke="#EAE7F8" strokeWidth="2.5" />
        )}
        {resolved.frame === 'lavender_ring' && (
          <circle cx="60" cy="60" r="54" fill="none" stroke="#A78BFA" strokeWidth="4" />
        )}
        {resolved.frame === 'cyan_circuit' && (
          <g>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#45C4D8" strokeWidth="4" />
            <circle cx="60" cy="60" r="58" fill="none" stroke="#45C4D8" strokeWidth="1.5" strokeDasharray="10 8" opacity="0.65" />
          </g>
        )}
        {resolved.frame === 'emerald_laurel' && (
          <g>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#38B982" strokeWidth="4.5" />
            <circle cx="24" cy="96" r="4" fill="#38B982" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="96" cy="96" r="4" fill="#38B982" stroke="#FFFFFF" strokeWidth="1.5" />
          </g>
        )}
        {resolved.frame === 'gold_crest' && (
          <g>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#FFC857" strokeWidth="5" />
            <polygon
              points="60,2 62.2,6.6 67.2,7.3 63.6,10.8 64.5,15.8 60,13.4 55.5,15.8 56.4,10.8 52.8,7.3 57.8,6.6"
              fill="#FFC857"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
          </g>
        )}
        {resolved.frame === 'champion_halo' && (
          <g>
            <circle cx="60" cy="60" r="54" fill="none" stroke={`url(#${frameGradId})`} strokeWidth="5.5" />
            <circle cx="60" cy="60" r="58.5" fill="none" stroke="#FFC857" strokeWidth="1.4" strokeDasharray="6 6" />
          </g>
        )}
      </svg>
    </div>
  );
};

export const AvatarSkeleton: React.FC<{ size?: PlayerAvatarProps['size']; className?: string }> = ({
  size = 'md',
  className = '',
}) => (
  <div
    aria-hidden="true"
    className={`sd-skeleton shrink-0 rounded-full border border-[#EAE7F8] ${SIZE_CLASS[size]} ${className}`}
  />
);
