interface Props {
  size?: number
  color?: string
  lightColor?: string
  className?: string
  style?: React.CSSProperties
}

export default function HeartSVG({ size = 24, color = '#BE1E2E', lightColor, className, style }: Props) {
  const id = `hg-${color.replace('#', '')}`
  const light = lightColor ?? lighten(color)

  return (
    <svg
      width={size}
      height={size}
      viewBox="-18 -17 36 34"
      fill="none"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id={id} x1="-12" y1="-15" x2="10" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={light} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={HEART_D} fill={`url(#${id})`} />
      {/* specular highlight */}
      <ellipse cx="-6" cy="-9" rx="3" ry="4" transform="rotate(-25 -6 -9)" fill="rgba(255,255,255,0.28)" />
    </svg>
  )
}

// Parametric heart path sampled at 80 points, radius ~16 units
export const HEART_D = buildHeartPath()

function buildHeartPath(): string {
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const t = (i / 80) * Math.PI * 2
    const x = 16 * Math.sin(t) ** 3
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 1.5
    pts.push(i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return pts.join(' ') + ' Z'
}

function lighten(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 70)
  const g = Math.min(255, ((n >> 8) & 0xff) + 50)
  const b = Math.min(255, (n & 0xff) + 50)
  return `rgb(${r},${g},${b})`
}
