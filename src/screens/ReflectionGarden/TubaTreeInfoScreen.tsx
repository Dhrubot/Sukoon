// src/screens/ReflectionGarden/TubaTreeInfoScreen.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Ellipse,
  Circle,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { withAlpha } from '../../utils/color';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { STAGE_THRESHOLDS, STAGE_INFO } from '../../constants/tubaTree';

// ═══════════════════════════════════════════════════════════════════
// STAGE SVG COMPONENTS
// Geometry ported from the HTML mockup's .stage-sky (140 × 130 viewBox).
// Each stage has a dedicated component so the illustrations are precise
// and consistent across themes — no runtime math needed.
// ═══════════════════════════════════════════════════════════════════

const W = 140;
const H = 130;

// ── Shared palette ────────────────────────────────────────────────
const TRUNK_DARK  = '#4a3728';
const TRUNK_MID   = '#5c4535';
const TRUNK_LIGHT = '#6b5040';

const C_FAJR     = '#7986CB';
const C_FAJR_L   = '#9FA8DA';
const C_DHUHR    = '#81C784';
const C_DHUHR_L  = '#A5D6A7';
const C_ASR      = '#DCE775';
const C_ASR_L    = '#D4E157';
const C_MAGHRIB  = '#CE93D8';
const C_MAGHRIB_L = '#BA68C8';
const C_ISHA     = '#9FA8DA';
const C_ISHA_L   = '#7986CB';
const C_BLOOM    = '#e8c97a';

// ── Unique gradient-id factory (avoids SVG def collisions in ScrollView) ──
const gid = (stage: number, name: string) => `s${stage}_${name}`;

// ─────────────────────────────────────────────────────────────────
// Stage 1 — Seedling: thin stem, 2 first leaves
// ─────────────────────────────────────────────────────────────────
const SeedlingSVG: React.FC = () => (
  <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <Defs>
      <SvgLinearGradient id={gid(1, 't')} x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%" stopColor={TRUNK_DARK} />
        <Stop offset="100%" stopColor={TRUNK_MID} stopOpacity="0.8" />
      </SvgLinearGradient>
    </Defs>

    {/* Stem */}
    <Path
      d="M 70 126 C 70 114 70 106 70 96"
      stroke={`url(#${gid(1, 't')})`}
      strokeWidth={4}
      fill="none"
      strokeLinecap="round"
    />
    <Path
      d="M 70 96 C 70 88 70 80 70 72"
      stroke={`url(#${gid(1, 't')})`}
      strokeWidth={3.5}
      fill="none"
      strokeLinecap="round"
      opacity={0.7}
    />

    {/* 2 first leaves — one Isha (left), one Dhuhr (right) */}
    <Ellipse cx={65} cy={82} rx={3} ry={5} fill={C_ISHA}  opacity={0.70} transform="rotate(-30, 65, 82)" />
    <Ellipse cx={76} cy={78} rx={3} ry={5} fill={C_DHUHR} opacity={0.65} transform="rotate(25, 76, 78)" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// Stage 2 — Sapling: 2 branches, ~6 leaves
// ─────────────────────────────────────────────────────────────────
const SaplingSVG: React.FC = () => (
  <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <Defs>
      <SvgLinearGradient id={gid(2, 't')} x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%" stopColor={TRUNK_DARK} />
        <Stop offset="100%" stopColor={TRUNK_MID} />
      </SvgLinearGradient>
    </Defs>

    {/* Trunk */}
    <Path
      d="M 70 126 Q 69 90 70 46"
      stroke={`url(#${gid(2, 't')})`}
      strokeWidth={6}
      fill="none"
      strokeLinecap="round"
    />

    {/* Fajr branch — upper left */}
    <Path d="M 70 78 C 62 72 52 66 42 58" stroke={C_FAJR} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.72} />
    {/* Dhuhr branch — upper right */}
    <Path d="M 70 76 C 78 70 88 64 98 56" stroke={C_DHUHR} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.72} />

    {/* Fajr leaves */}
    <Ellipse cx={40} cy={56} rx={3.5} ry={5.5} fill={C_FAJR}   opacity={0.75} transform="rotate(-40, 40, 56)" />
    <Ellipse cx={34} cy={50} rx={3.0} ry={5.0} fill={C_FAJR_L} opacity={0.68} transform="rotate(-50, 34, 50)" />
    {/* Dhuhr leaves */}
    <Ellipse cx={98} cy={54} rx={3.5} ry={5.5} fill={C_DHUHR}   opacity={0.75} transform="rotate(40, 98, 54)" />
    <Ellipse cx={104} cy={48} rx={3.0} ry={5.0} fill={C_DHUHR_L} opacity={0.68} transform="rotate(50, 104, 48)" />
    {/* Isha top leaves */}
    <Ellipse cx={68} cy={50} rx={3.0} ry={5.0} fill={C_ISHA} opacity={0.65} transform="rotate(-10, 68, 50)" />
    <Ellipse cx={72} cy={40} rx={3.0} ry={5.0} fill={C_ISHA} opacity={0.62} transform="rotate(5, 72, 40)" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// Stage 3 — Growing: 4 branches, canopy beginning
// ─────────────────────────────────────────────────────────────────
const GrowingSVG: React.FC = () => (
  <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <Defs>
      <SvgLinearGradient id={gid(3, 't')} x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%" stopColor={TRUNK_DARK} />
        <Stop offset="100%" stopColor={TRUNK_MID} />
      </SvgLinearGradient>
    </Defs>

    {/* Trunk — noticeably thicker */}
    <Path
      d="M 70 126 Q 69 85 70 28"
      stroke={`url(#${gid(3, 't')})`}
      strokeWidth={8}
      fill="none"
      strokeLinecap="round"
    />

    {/* Fajr — upper left */}
    <Path d="M 70 82 C 60 74 46 66 34 56" stroke={C_FAJR}    strokeWidth={3}   fill="none" strokeLinecap="round" opacity={0.72} />
    {/* Dhuhr — upper right */}
    <Path d="M 70 80 C 80 72 94 64 106 56" stroke={C_DHUHR}  strokeWidth={3}   fill="none" strokeLinecap="round" opacity={0.72} />
    {/* Maghrib — mid left */}
    <Path d="M 70 98 C 60 94 48 90 36 86" stroke={C_MAGHRIB} strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.65} />
    {/* Asr — mid right */}
    <Path d="M 70 96 C 80 92 92 88 104 84" stroke={C_ASR}    strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.65} />

    {/* Fajr leaves */}
    <Ellipse cx={32} cy={54} rx={4.0} ry={6.5} fill={C_FAJR}   opacity={0.80} transform="rotate(-44, 32, 54)" />
    <Ellipse cx={25} cy={47} rx={3.5} ry={5.5} fill={C_FAJR_L} opacity={0.72} transform="rotate(-54, 25, 47)" />
    {/* Dhuhr leaves */}
    <Ellipse cx={108} cy={54} rx={4.0} ry={6.5} fill={C_DHUHR}   opacity={0.80} transform="rotate(44, 108, 54)" />
    <Ellipse cx={115} cy={46} rx={3.5} ry={5.5} fill={C_DHUHR_L} opacity={0.72} transform="rotate(55, 115, 46)" />
    {/* Maghrib / Asr */}
    <Ellipse cx={32}  cy={84} rx={3.5} ry={5.5} fill={C_MAGHRIB} opacity={0.75} transform="rotate(-56, 32, 84)" />
    <Ellipse cx={104} cy={82} rx={3.5} ry={5.5} fill={C_ASR}     opacity={0.75} transform="rotate(56, 104, 82)" />
    {/* Isha — straight up */}
    <Ellipse cx={68} cy={30} rx={4.0} ry={6.5} fill={C_ISHA} opacity={0.78} transform="rotate(-8, 68, 30)" />
    <Ellipse cx={73} cy={20} rx={3.5} ry={5.5} fill={C_ISHA} opacity={0.70} transform="rotate(6, 73, 20)" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// Stage 4 — Flourishing: all 5 branches + sub-branches + first blooms
// ─────────────────────────────────────────────────────────────────
const FlourishingSVG: React.FC = () => (
  <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <Defs>
      <SvgLinearGradient id={gid(4, 't')} x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%" stopColor={TRUNK_MID} />
        <Stop offset="100%" stopColor={TRUNK_LIGHT} />
      </SvgLinearGradient>
    </Defs>

    {/* Trunk */}
    <Path
      d="M 70 126 Q 69 82 70 16"
      stroke={`url(#${gid(4, 't')})`}
      strokeWidth={9}
      fill="none"
      strokeLinecap="round"
    />

    {/* Roots */}
    <Path d="M 70 126 C 60 130 48 131 36 129" stroke={TRUNK_DARK} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.45} />
    <Path d="M 70 126 C 80 130 92 131 104 129" stroke={TRUNK_DARK} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.45} />

    {/* ── Fajr main + sub-branch ── */}
    <Path d="M 70 80 C 57 70 40 60 26 48"   stroke={C_FAJR} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.75} />
    <Path d="M 40 66 C 32 58 26 50 20 40"   stroke={C_FAJR} strokeWidth={2.0} fill="none" strokeLinecap="round" opacity={0.52} />
    <Path d="M 46 70 C 38 60 34 50 32 38"   stroke={C_FAJR} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.45} />

    {/* ── Dhuhr main + sub-branch ── */}
    <Path d="M 70 78 C 83 68 100 58 114 46" stroke={C_DHUHR} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.75} />
    <Path d="M 100 62 C 108 54 114 46 118 36" stroke={C_DHUHR} strokeWidth={2.0} fill="none" strokeLinecap="round" opacity={0.52} />

    {/* ── Maghrib + Asr ── */}
    <Path d="M 70 96 C 58 92 44 88 30 84"   stroke={C_MAGHRIB} strokeWidth={3.0} fill="none" strokeLinecap="round" opacity={0.68} />
    <Path d="M 70 94 C 82 90 96 86 110 82"  stroke={C_ASR}     strokeWidth={3.0} fill="none" strokeLinecap="round" opacity={0.68} />

    {/* ── Isha — straight up ── */}
    <Path d="M 70 60 C 71 42 72 28 72 14"   stroke={C_ISHA} strokeWidth={3.0} fill="none" strokeLinecap="round" opacity={0.70} />

    {/* Fajr leaves */}
    <Ellipse cx={22}  cy={46} rx={4.5} ry={7.0} fill={C_FAJR}   opacity={0.82} transform="rotate(-48, 22, 46)" />
    <Ellipse cx={15}  cy={38} rx={3.5} ry={6.0} fill={C_FAJR_L} opacity={0.74} transform="rotate(-58, 15, 38)" />
    <Ellipse cx={32}  cy={56} rx={4.0} ry={6.5} fill={C_FAJR}   opacity={0.72} transform="rotate(-40, 32, 56)" />
    {/* Dhuhr leaves */}
    <Ellipse cx={116} cy={44} rx={4.5} ry={7.0} fill={C_DHUHR}   opacity={0.82} transform="rotate(48, 116, 44)" />
    <Ellipse cx={122} cy={36} rx={3.5} ry={6.0} fill={C_DHUHR_L} opacity={0.74} transform="rotate(58, 122, 36)" />
    <Ellipse cx={104} cy={56} rx={4.0} ry={6.5} fill={C_DHUHR}   opacity={0.72} transform="rotate(40, 104, 56)" />
    {/* Maghrib / Asr */}
    <Ellipse cx={26}  cy={82} rx={4.0} ry={6.0} fill={C_MAGHRIB} opacity={0.78} transform="rotate(-58, 26, 82)" />
    <Ellipse cx={112} cy={80} rx={4.0} ry={6.0} fill={C_ASR}     opacity={0.78} transform="rotate(58, 112, 80)" />
    {/* Isha top */}
    <Ellipse cx={70}  cy={18} rx={5.0} ry={8.0} fill={C_ISHA}   opacity={0.85} transform="rotate(-5, 70, 18)" />

    {/* ── Gold blooms (mood 4-5 leaves) ── */}
    {/* Bloom on Fajr tip */}
    <Ellipse cx={13} cy={36} rx={4.5} ry={7.0} fill={C_FAJR_L} opacity={0.90} transform="rotate(-56, 13, 36)" />
    <Circle  cx={7}  cy={29} r={2.0}  fill={C_BLOOM}            opacity={0.95} />
    {/* Bloom on Isha apex */}
    <Ellipse cx={68} cy={14} rx={5.0} ry={8.0} fill={C_ISHA}   opacity={0.90} transform="rotate(-4, 68, 14)" />
    <Circle  cx={62} cy={8}  r={2.0}  fill={C_BLOOM}            opacity={0.95} />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// Stage 5 — Ancient: dense canopy, many sub-branches, abundant blooms
// ─────────────────────────────────────────────────────────────────
const AncientSVG: React.FC = () => (
  <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <Defs>
      <SvgLinearGradient id={gid(5, 't')} x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%" stopColor={TRUNK_LIGHT} />
        <Stop offset="100%" stopColor="#7d6050" />
      </SvgLinearGradient>
    </Defs>

    {/* Thick trunk */}
    <Path
      d="M 70 126 Q 68 94 70 8"
      stroke={`url(#${gid(5, 't')})`}
      strokeWidth={11}
      fill="none"
      strokeLinecap="round"
    />

    {/* Roots — more visible at ancient stage */}
    <Path d="M 70 126 C 60 130 48 131 36 129"  stroke={TRUNK_DARK} strokeWidth={3}   fill="none" strokeLinecap="round" opacity={0.50} />
    <Path d="M 70 126 C 80 130 92 131 104 129" stroke={TRUNK_DARK} strokeWidth={3}   fill="none" strokeLinecap="round" opacity={0.50} />
    <Path d="M 66 128 C 56 132 42 133 28 131"  stroke={TRUNK_DARK} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.30} />
    <Path d="M 74 128 C 84 132 98 133 112 131" stroke={TRUNK_DARK} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.30} />

    {/* ── Fajr — main + 2 sub-branches ── */}
    <Path d="M 70 80 C 54 68 36 56 18 42"     stroke={C_FAJR} strokeWidth={4.0} fill="none" strokeLinecap="round" opacity={0.78} />
    <Path d="M 36 62 C 24 52 16 42 10 30"     stroke={C_FAJR} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
    <Path d="M 46 70 C 38 60 34 50 32 38"     stroke={C_FAJR} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.50} />

    {/* ── Dhuhr — main + sub-branch ── */}
    <Path d="M 70 78 C 86 66 104 54 122 40"   stroke={C_DHUHR} strokeWidth={4.0} fill="none" strokeLinecap="round" opacity={0.78} />
    <Path d="M 104 58 C 112 48 118 38 122 26" stroke={C_DHUHR} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
    <Path d="M 92 66 C 100 56 108 48 112 36"  stroke={C_DHUHR} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.48} />

    {/* ── Maghrib — main + sub ── */}
    <Path d="M 70 96 C 54 92 36 88 18 84"     stroke={C_MAGHRIB} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.72} />
    <Path d="M 36 90 C 24 86 16 80 10 72"     stroke={C_MAGHRIB} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.48} />

    {/* ── Asr — main + sub ── */}
    <Path d="M 70 94 C 86 90 104 86 122 82"   stroke={C_ASR} strokeWidth={3.5} fill="none" strokeLinecap="round" opacity={0.72} />
    <Path d="M 104 88 C 114 84 122 78 128 70" stroke={C_ASR} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.48} />

    {/* ── Isha — straight up + sub ── */}
    <Path d="M 70 60 C 71 40 72 24 72 8"      stroke={C_ISHA} strokeWidth={3.0} fill="none" strokeLinecap="round" opacity={0.72} />
    <Path d="M 72 36 C 78 24 80 14 78 4"      stroke={C_ISHA} strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.48} />
    <Path d="M 70 48 C 62 36 58 24 60 14"     stroke={C_ISHA} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.44} />

    {/* ── Dense Fajr leaves ── */}
    <Ellipse cx={14}  cy={40} rx={5.0} ry={7.5} fill={C_FAJR}   opacity={0.85} transform="rotate(-52, 14, 40)" />
    <Ellipse cx={6}   cy={30} rx={4.0} ry={6.0} fill={C_FAJR_L} opacity={0.76} transform="rotate(-60, 6, 30)" />
    <Ellipse cx={20}  cy={50} rx={4.5} ry={7.0} fill={C_FAJR}   opacity={0.74} transform="rotate(-44, 20, 50)" />
    <Ellipse cx={10}  cy={44} rx={3.5} ry={5.5} fill={C_FAJR_L} opacity={0.70} transform="rotate(-38, 10, 44)" />
    <Ellipse cx={28}  cy={38} rx={4.0} ry={6.0} fill={C_FAJR}   opacity={0.72} transform="rotate(-62, 28, 38)" />
    {/* ── Dense Dhuhr leaves ── */}
    <Ellipse cx={124} cy={38} rx={5.0} ry={7.5} fill={C_DHUHR}   opacity={0.85} transform="rotate(52, 124, 38)" />
    <Ellipse cx={130} cy={28} rx={4.0} ry={6.0} fill={C_DHUHR_L} opacity={0.76} transform="rotate(62, 130, 28)" />
    <Ellipse cx={118} cy={50} rx={4.5} ry={7.0} fill={C_DHUHR}   opacity={0.74} transform="rotate(44, 118, 50)" />
    <Ellipse cx={112} cy={62} rx={4.0} ry={6.0} fill={C_DHUHR_L} opacity={0.70} transform="rotate(36, 112, 62)" />
    {/* ── Maghrib leaves ── */}
    <Ellipse cx={14}  cy={82} rx={4.5} ry={6.5} fill={C_MAGHRIB}   opacity={0.80} transform="rotate(-60, 14, 82)" />
    <Ellipse cx={8}   cy={74} rx={3.5} ry={5.5} fill={C_MAGHRIB_L} opacity={0.72} transform="rotate(-68, 8, 74)" />
    {/* ── Asr leaves ── */}
    <Ellipse cx={122} cy={80} rx={4.5} ry={6.5} fill={C_ASR}   opacity={0.80} transform="rotate(60, 122, 80)" />
    <Ellipse cx={128} cy={72} rx={3.5} ry={5.5} fill={C_ASR_L} opacity={0.72} transform="rotate(68, 128, 72)" />
    {/* ── Isha canopy top ── */}
    <Ellipse cx={70}  cy={10} rx={5.5} ry={9.0} fill={C_ISHA}   opacity={0.88} transform="rotate(-4, 70, 10)" />
    <Ellipse cx={78}  cy={6}  rx={4.0} ry={6.5} fill={C_ISHA_L} opacity={0.75} transform="rotate(8, 78, 6)" />
    <Ellipse cx={60}  cy={14} rx={4.0} ry={6.5} fill={C_ISHA_L} opacity={0.72} transform="rotate(-16, 60, 14)" />

    {/* ── Four gold blooms ── */}
    {/* Isha apex */}
    <Ellipse cx={70} cy={8}  rx={5.5} ry={8.5} fill={C_ISHA}     opacity={0.92} />
    <Circle  cx={63} cy={2}  r={2.2}  fill={C_BLOOM}              opacity={0.98} />
    {/* Fajr tip */}
    <Ellipse cx={10} cy={32} rx={4.5} ry={7.0} fill={C_FAJR_L}   opacity={0.90} transform="rotate(-58, 10, 32)" />
    <Circle  cx={4}  cy={25} r={2.0}  fill={C_BLOOM}              opacity={0.98} />
    {/* Dhuhr tip */}
    <Ellipse cx={128} cy={30} rx={4.5} ry={7.0} fill={C_DHUHR_L} opacity={0.90} transform="rotate(60, 128, 30)" />
    <Circle  cx={134} cy={23} r={2.0}  fill={C_BLOOM}             opacity={0.98} />
    {/* Maghrib outer */}
    <Ellipse cx={10} cy={76} rx={4.0} ry={6.5} fill={C_MAGHRIB_L} opacity={0.88} transform="rotate(-62, 10, 76)" />
    <Circle  cx={4}  cy={69} r={1.8}  fill={C_BLOOM}               opacity={0.98} />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════════
// STAGE DATA
// ═══════════════════════════════════════════════════════════════════

const STAGE_VISUALS = [
  {
    key:          'seedling',
    Illustration: SeedlingSVG,
    description:  'A tender stem reaches upward with your first acts of presence. Every single prayer that you pause to feel plants this seed.',
    hadith:       '"The parable of the one who remembers his Lord and the one who does not is like the living and the dead." — Bukhari',
    hasSubBranches: false,
  },
  {
    key:          'sapling',
    Illustration: SaplingSVG,
    description:  'Branches begin to reach in two directions. Each prayer time has its own color — the tree remembers which prayers you brought your heart to.',
    hadith:       '"Take up good deeds only as much as you are able, for the best deeds are those done regularly even if they are few." — Ibn Majah',
    hasSubBranches: false,
  },
  {
    key:          'growing',
    Illustration: GrowingSVG,
    description:  'All five prayers begin to branch out. The canopy is forming — dawam (consistency) is deepening the roots you cannot see.',
    hadith:       '"The most beloved deed to Allah is the most regular and constant even if it were little." — Bukhari',
    hasSubBranches: false,
  },
  {
    key:          'flourishing',
    Illustration: FlourishingSVG,
    description:  'Sub-branches fork from the main limbs. Gold blooms appear where your focus was deepest (mood 4–5). The tree is becoming something worth pausing to look at.',
    hadith:       '"In Paradise there is a tree in whose shade a rider could travel for a hundred years and not leave it." — Bukhari',
    hasSubBranches: true,
  },
  {
    key:          'ancient',
    Illustration: AncientSVG,
    description:  'A full canopy with a thick trunk, dense sub-branches on every limb, and abundant gold blooms. This is the fruit of sustained devotion — your dawam made visible.',
    hadith:       '"SubhanAllah, wal-hamdulillah, wa la ilaha illAllah, wa Allahu Akbar — each plants a tree for you in Paradise." — Tirmidhi',
    hasSubBranches: true,
  },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════

const TubaTreeInfoScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const prayerColors = [
    theme.colors.prayer?.fajr    || '#7986CB',
    theme.colors.prayer?.dhuhr   || '#FFD54F',
    theme.colors.prayer?.asr     || '#FFB74D',
    theme.colors.prayer?.maghrib || '#CE93D8',
    theme.colors.prayer?.isha    || '#5C6BC0',
  ];

  const bloomColor  = theme.colors.garden?.bloomGlow     || '#D4AF37';
  const dawamColor  = theme.colors.garden?.dawamPillText || theme.colors.primary.DEFAULT;

  // Sky background colour for the illustration tile — matches the mockup's
  // dark forest-green sky used in the stage panels
  const stageSkyBg =
    theme.mode === 'midnight' ? '#080E2A' :
    theme.mode === 'dark'     ? '#0D1940' :
                                '#1a3a2e'; // warm dark even in light mode

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your Tuba Tree</Text>
          <Text style={[styles.heroArabic, { color: dawamColor }]}>طُوبَىٰ</Text>
          <Text style={styles.heroSubtitle}>
            Every prayer with presence plants a leaf.{'\n'}
            Every day of consistency deepens the roots.
          </Text>
        </View>

        {/* ── What is Tuba ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Tuba?</Text>
          <Text style={styles.bodyText}>
            In Islamic tradition, Tuba (طوبى) is a tree in Jannah mentioned by the
            Prophet ﷺ. A rider could travel for a hundred years in its shade and never
            leave it. Its branches extend over the walls of Paradise, and from it flow
            rivers of honey, milk, and pure water.
          </Text>
          <View style={[styles.quoteCard, { borderColor: withAlpha(theme.colors.interactive.active, 0.19) }]}>
            <Text style={[styles.quoteText, { color: theme.colors.text.secondary }]}>
              "Tuba is a tree in Paradise. Its extent is a journey of a hundred years.
              The garments of the people of Paradise emerge from its sheaths."
            </Text>
            <Text style={[styles.quoteSource, { color: theme.colors.text.muted }]}>
              — Narrated by Ibn Hibban
            </Text>
          </View>
          <Text style={styles.bodyText}>
            Your Tuba Tree in Sukoon is a living mirror of your spiritual practice.
            It grows only through genuine reflection — not just marking prayers complete,
            but pausing to breathe, to feel, to connect.
          </Text>
        </View>

        {/* ── How it grows ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Your Tree Grows</Text>

          {[
            {
              n: '1',
              title: 'Pray with reflection',
              body:  'During any prayer, complete the mindfulness flow — breathe, reflect, and rate your focus. This creates a leaf on your tree.',
            },
            {
              n: '2',
              title: 'Each leaf finds its branch',
              body:  'The tree has 5 branches — one for each fard prayer. Your Fajr reflections grow on the Fajr branch, Dhuhr on the Dhuhr branch, and so on. Each branch is colored to match its prayer time.',
            },
            {
              n: '3',
              title: 'Focus determines leaf size',
              body:  'Your mood after prayer shapes the leaf. Low focus (1–2) creates small seed-leaves. Present focus (3) grows sprout-leaves. Deep khushoo (4–5) produces large bloom-leaves with a gold sparkle.',
            },
            {
              n: '4',
              title: 'Consistency deepens roots',
              body:  "Your dawam (دوام) — consecutive days of reflection — thickens the trunk and advances the tree through growth stages. Breaks don't destroy the tree, but dawam makes it stronger.",
            },
          ].map((step) => (
            <View key={step.n} style={styles.growthStep}>
              <View style={[styles.stepDot, { backgroundColor: theme.colors.interactive.active }]}>
                <Text style={styles.stepNumber}>{step.n}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Leaf types ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaf Types</Text>
          <View style={styles.leafTypeRow}>
            {[
              { stage: 'Seed',   mood: '1–2', desc: 'Small, translucent', icon: '🌱' },
              { stage: 'Sprout', mood: '3',   desc: 'Medium, vivid',      icon: '🌿' },
              { stage: 'Bloom',  mood: '4–5', desc: 'Large + gold sparkle', icon: '✦' },
            ].map((lt) => (
              <View
                key={lt.stage}
                style={[
                  styles.leafTypeCard,
                  {
                    backgroundColor: theme.colors.card.background,
                    borderColor: theme.colors.border.secondary,
                  },
                ]}
              >
                <Text style={styles.leafTypeIcon}>{lt.icon}</Text>
                <Text style={[styles.leafTypeName, { color: theme.colors.text.primary }]}>{lt.stage}</Text>
                <Text style={[styles.leafTypeMood, { color: theme.colors.interactive.active }]}>Focus {lt.mood}</Text>
                <Text style={[styles.leafTypeDesc, { color: theme.colors.text.muted }]}>{lt.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Branch colors ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Branches</Text>
          <Text style={styles.bodyText}>
            Each of the 5 branches represents a fard prayer. The color flows from
            the trunk's earthy brown into the prayer's signature color.
          </Text>
          <View style={styles.branchColorList}>
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer, i) => (
              <View key={prayer} style={styles.branchColorItem}>
                <View style={[styles.branchColorDot, { backgroundColor: prayerColors[i] }]} />
                <Text style={[styles.branchColorName, { color: theme.colors.text.primary }]}>{prayer}</Text>
                <View style={[styles.branchColorBar, { backgroundColor: withAlpha(prayerColors[i], 0.15) }]}>
                  <View
                    style={[
                      styles.branchColorFill,
                      { backgroundColor: prayerColors[i], width: `${40 + i * 12}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Growth stages ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Stages</Text>
          <Text style={styles.bodyText}>
            As your total reflections increase, the tree advances through five stages.
            Each stage changes the trunk thickness, branch reach, and unlocks new features.
          </Text>

          {STAGE_VISUALS.map((stageVis, index) => {
            const info      = STAGE_INFO[stageVis.key as keyof typeof STAGE_INFO];
            const threshold = STAGE_THRESHOLDS[index];

            return (
              <View
                key={stageVis.key}
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.colors.card.background,
                    borderColor: theme.colors.border.secondary,
                  },
                ]}
              >
                {/* ── Illustration tile ── */}
                <View
                  style={[
                    styles.stageIllustration,
                    { backgroundColor: stageSkyBg },
                  ]}
                >
                  <stageVis.Illustration />
                </View>

                {/* ── Text info ── */}
                <View style={styles.stageInfo}>
                  <View style={styles.stageHeader}>
                    <Text style={[styles.stageName, { color: theme.colors.text.primary }]}>
                      {info.name}
                    </Text>
                    <Text style={[styles.stageArabic, { color: dawamColor }]}>
                      {info.arabic}
                    </Text>
                  </View>

                  <Text style={[styles.stageRange, { color: theme.colors.interactive.active }]}>
                    {threshold.max === Infinity
                      ? `${threshold.min}+ reflections`
                      : `${threshold.min}–${threshold.max} reflections`}
                  </Text>

                  <Text style={[styles.stageDescription, { color: theme.colors.text.secondary }]}>
                    {stageVis.description}
                  </Text>

                  {stageVis.hasSubBranches && (
                    <View
                      style={[
                        styles.unlockChip,
                        { backgroundColor: theme.colors.interactive.active + '15' },
                      ]}
                    >
                      <Text style={[styles.unlockText, { color: theme.colors.interactive.active }]}>
                        ✦ Unlocks sub-branches
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Hadith ── */}
                <View style={[styles.stageHadith, { borderTopColor: theme.colors.border.secondary }]}>
                  <Text style={[styles.hadithText, { color: theme.colors.text.muted }]}>
                    {stageVis.hadith}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Ramadan mode ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ramadan Mode 🌙</Text>
          <Text style={styles.bodyText}>
            During the blessed month, your tree transforms. Branch colors shift toward
            gold, extra stars fill the night sky, and the crescent moon gains a warm
            halo. The stage label shows which day of Ramadan you're on.
          </Text>
          <Text style={styles.bodyText}>
            This happens automatically — no settings to change. Your tree feels the
            baraka of the month just as you do.
          </Text>
        </View>

        {/* ── Read your leaves ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Read Your Leaves</Text>
          <Text style={styles.bodyText}>
            Tap any leaf on your tree to see its details — which prayer it came from,
            when you prayed, your mood level, and whether you wrote a reflection.
            Each leaf is a moment of connection with Allah, preserved in your garden.
          </Text>
        </View>

        {/* ── Closing card ─────────────────────────────────────── */}
        <View
          style={[
            styles.closingCard,
            {
              backgroundColor: theme.colors.card.background,
              borderColor: theme.colors.border.secondary,
            },
          ]}
        >
          <Text style={[styles.closingArabic, { color: dawamColor }]}>
            طُوبَىٰ لَهُمْ وَحُسْنُ مَآبٍ
          </Text>
          <Text style={[styles.closingTranslation, { color: theme.colors.text.secondary }]}>
            "Tuba (blessedness) is for them, and a beautiful place of return."
          </Text>
          <Text style={[styles.closingRef, { color: theme.colors.text.muted }]}>
            — Quran 13:29
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },

    // Hero
    hero: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.xl,
    },
    heroTitle: {
      fontSize: 28,
      fontFamily: theme.typography.fontFamily.headingRegular,
      fontWeight: '300',
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    heroArabic: {
      fontSize: 36,
      fontFamily: Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
      marginBottom: theme.spacing.md,
    },
    heroSubtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      lineHeight: 22,
      fontStyle: 'italic',
    },

    // Sections
    section: {
      paddingHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing['2xl'],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    bodyText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 23,
      marginBottom: theme.spacing.md,
    },

    // Quote
    quoteCard: {
      borderLeftWidth: 3,
      paddingLeft: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginVertical: theme.spacing.md,
    },
    quoteText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      lineHeight: 22,
    },
    quoteSource: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginTop: theme.spacing.xs,
    },

    // Growth steps
    growthStep: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    stepNumber: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: '#fff',
    },
    stepContent: { flex: 1 },
    stepTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    stepBody: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 21,
    },

    // Leaf types
    leafTypeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    leafTypeCard: {
      flex: 1,
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
      gap: 4,
    },
    leafTypeIcon: { fontSize: 24, marginBottom: 2 },
    leafTypeName: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    leafTypeMood: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.body,
    },
    leafTypeDesc: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.body,
      textAlign: 'center',
    },

    // Branch colors
    branchColorList: { gap: 10 },
    branchColorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    branchColorDot: { width: 12, height: 12, borderRadius: 6 },
    branchColorName: {
      width: 60,
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    branchColorBar: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    branchColorFill: { height: '100%', borderRadius: 3 },

    // Stage cards
    stageCard: {
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
    },
    stageIllustration: {
      alignItems: 'center',
      // No extra padding — SVG fills the tile naturally
      paddingTop: 0,
      paddingBottom: 0,
    },
    stageInfo: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    stageHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 4,
    },
    stageName: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    stageArabic: {
      fontSize: 16,
      fontFamily: Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
    },
    stageRange: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginBottom: theme.spacing.xs,
    },
    stageDescription: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.body,
      lineHeight: 21,
    },
    unlockChip: {
      alignSelf: 'flex-start',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: theme.spacing.sm,
    },
    unlockText: {
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    stageHadith: {
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md - 2,
    },
    hadithText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      lineHeight: 18,
    },

    // Closing
    closingCard: {
      marginHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.xl,
    },
    closingArabic: {
      fontSize: 26,
      fontFamily: Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    closingTranslation: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 22,
    },
    closingRef: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginTop: theme.spacing.xs,
    },
  });

export default TubaTreeInfoScreen;
