import styles from "./ClockFace.module.css";

/**
 * Analog clock face:
 * - 12 tick marks around a circle
 * - White minute hand (60-minute cycle = 3600s, visually sped to 120s)
 * - Red second hand spinning every 60s, long and slender
 * - Small red center pivot
 */
export default function ClockFace() {
  const cx = 200;
  const cy = 200;
  const r  = 172; // tick mark outer radius

  // 12 tick marks — longer at 12/3/6/9
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const isMain = i % 3 === 0;
    const inner  = isMain ? r - 22 : r - 12;
    return {
      x1: Number((cx + Math.cos(angle) * inner).toFixed(3)),
      y1: Number((cy + Math.sin(angle) * inner).toFixed(3)),
      x2: Number((cx + Math.cos(angle) * r).toFixed(3)),
      y2: Number((cy + Math.sin(angle) * r).toFixed(3)),
      isMain,
    };
  });

  // Minute hand — static, shorter so it doesn't reach the ticks
  const minuteLen = r - 45;
  // Second hand — longer, ticking precisely on the marks
  const secondLen = r + 20;

  return (
    <div className={styles.clock} aria-hidden="true">
      <svg
        className={styles.clockSvg}
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1}
            x2={t.x2} y2={t.y2}
            stroke="rgba(255,255,255,0.70)"
            strokeWidth={t.isMain ? 2 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* ── Minute hand (white, slower) ── */}
        <g className={styles.minuteHand}>
          {/* Tail */}
          <line
            x1={cx} y1={cy}
            x2={cx} y2={cy + 28}
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={1.25}
            strokeLinecap="round"
          />
          {/* Main minute hand */}
          <line
            x1={cx} y1={cy}
            x2={cx} y2={cy - minuteLen}
            stroke="rgba(255,255,255,0.75)"
            strokeWidth={1.25}
            strokeLinecap="round"
          />
        </g>

        {/* ── Second hand (red, longer, full 60s rotation) ── */}
        <g className={styles.secondHand}>
          {/* Counter-weight tail */}
          <line
            x1={cx} y1={cy}
            x2={cx} y2={cy + 42}
            stroke="#e63946"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          {/* Long second hand */}
          <line
            x1={cx} y1={cy}
            x2={cx} y2={cy - secondLen}
            stroke="#e63946"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>

        {/* Center pivot */}
        <circle cx={cx} cy={cy} r={5} fill="#e63946" />
        <circle cx={cx} cy={cy} r={2.5} fill="#fff" />
      </svg>
    </div>
  );
}
