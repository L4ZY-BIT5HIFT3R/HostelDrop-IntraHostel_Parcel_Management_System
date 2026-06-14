import React from 'react';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import { Colors } from '../utils/theme';

type Props = {
  size?: number;
  /** Background of the stamp tile. Defaults to the vermilion brand ink. */
  background?: string;
  /** Color of the parcel mark. Defaults to a cream paper tone. */
  mark?: string;
  rounded?: number;
};

/**
 * HostelDrop brandmark — a parcel dropping into a taped reception box,
 * set on a vermilion "stamp" tile. Matches the Mailroom art direction.
 */
export default function Brandmark({
  size = 64,
  background = Colors.accent,
  mark = '#FBF6EA',
  rounded,
}: Props) {
  const r = rounded ?? size * 0.22;
  const stroke = Math.max(2, size * 0.05);

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* stamp tile */}
      <Rect x={1} y={1} width={62} height={62} rx={r * (64 / size)} fill={background} />

      {/* drop arrow */}
      <Line x1={32} y1={12} x2={32} y2={27} stroke={mark} strokeWidth={stroke} strokeLinecap="round" />
      <Path
        d="M25 21 L32 28 L39 21"
        stroke={mark}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* parcel box */}
      <Rect
        x={18}
        y={32}
        width={28}
        height={20}
        rx={2}
        stroke={mark}
        strokeWidth={stroke}
        fill="none"
      />
      {/* tape: horizontal band + vertical seam */}
      <Line x1={18} y1={39} x2={46} y2={39} stroke={mark} strokeWidth={stroke} strokeLinecap="round" />
      <Line x1={32} y1={32} x2={32} y2={39} stroke={mark} strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  );
}
