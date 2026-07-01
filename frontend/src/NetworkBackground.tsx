import React from 'react'

type NodeKind = 'person' | 'group' | 'accent'

type FriendNode = {
  id: string
  x: number
  y: number
  label: string
  sublabel?: string
  size: number
  kind: NodeKind
  ring?: boolean
}

type Link = {
  id: string
  from: string
  to: string
  bend?: number
  pulse?: boolean
}

const nodes: FriendNode[] = [
  // left cluster
  { id: 'a', x: 120, y: 180, label: 'AL', sublabel: 'Ali', size: 18, kind: 'person', ring: true },
  { id: 'b', x: 220, y: 130, label: 'SM', sublabel: 'Saman', size: 16, kind: 'person' },
  { id: 'c', x: 260, y: 240, label: 'FR', sublabel: 'Friends', size: 26, kind: 'group', ring: true },
  { id: 'd', x: 160, y: 310, label: 'LN', sublabel: 'Lina', size: 16, kind: 'person' },

  // center cluster
  { id: 'e', x: 470, y: 170, label: 'AM', sublabel: 'Amina', size: 17, kind: 'person' },
  { id: 'f', x: 580, y: 110, label: 'FA', sublabel: 'Family', size: 28, kind: 'group', ring: true },
  { id: 'g', x: 640, y: 240, label: 'OM', sublabel: 'Omar', size: 16, kind: 'person' },
  { id: 'h', x: 500, y: 300, label: 'WK', sublabel: 'Work', size: 24, kind: 'group' },

  // right cluster
  { id: 'i', x: 920, y: 180, label: 'SA', sublabel: 'Sara', size: 16, kind: 'person' },
  { id: 'j', x: 1040, y: 130, label: 'NW', sublabel: 'New circle', size: 26, kind: 'group', ring: true },
  { id: 'k', x: 1110, y: 260, label: 'DV', sublabel: 'David', size: 16, kind: 'person' },
  { id: 'l', x: 940, y: 330, label: 'CM', sublabel: 'Community', size: 28, kind: 'group' },

  // small soft accent nodes
  { id: 'm', x: 355, y: 95, label: '', size: 8, kind: 'accent' },
  { id: 'n', x: 785, y: 95, label: '', size: 10, kind: 'accent' },
  { id: 'o', x: 1170, y: 370, label: '', size: 9, kind: 'accent' },
]

const links: Link[] = [
  { id: 'ab', from: 'a', to: 'b', bend: -30 },
  { id: 'ac', from: 'a', to: 'c', bend: 28, pulse: true },
  { id: 'ad', from: 'a', to: 'd', bend: 26 },
  { id: 'bc', from: 'b', to: 'c', bend: 20 },
  { id: 'cd', from: 'c', to: 'd', bend: -24 },

  { id: 'ce', from: 'c', to: 'e', bend: -50, pulse: true },
  { id: 'cf', from: 'c', to: 'f', bend: -30 },
  { id: 'ch', from: 'c', to: 'h', bend: 36 },

  { id: 'ef', from: 'e', to: 'f', bend: -24 },
  { id: 'eg', from: 'e', to: 'g', bend: -12 },
  { id: 'eh', from: 'e', to: 'h', bend: 18 },
  { id: 'fg', from: 'f', to: 'g', bend: 24, pulse: true },
  { id: 'gh', from: 'g', to: 'h', bend: 18 },

  { id: 'fi', from: 'f', to: 'i', bend: -35 },
  { id: 'gj', from: 'g', to: 'j', bend: -25 },
  { id: 'hk', from: 'h', to: 'k', bend: 32 },
  { id: 'hi', from: 'h', to: 'i', bend: 20 },

  { id: 'ij', from: 'i', to: 'j', bend: -22 },
  { id: 'ik', from: 'i', to: 'k', bend: 18 },
  { id: 'il', from: 'i', to: 'l', bend: 34 },
  { id: 'jk', from: 'j', to: 'k', bend: 20, pulse: true },
  { id: 'jl', from: 'j', to: 'l', bend: 30 },
  { id: 'kl', from: 'k', to: 'l', bend: -24 },
]

const nodeById = new Map(nodes.map((node) => [node.id, node]))

function curvedPath(from: FriendNode, to: FriendNode, bend = 0) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = -dy / length
  const ny = dx / length
  const cx = mx + nx * bend
  const cy = my + ny * bend

  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

function BackgroundHalo({
  cx,
  cy,
  rx,
  ry,
  className,
}: {
  cx: number
  cy: number
  rx: number
  ry: number
  className?: string
}) {
  return <ellipse className={className || ''} cx={cx} cy={cy} rx={rx} ry={ry} />
}

function PersonNode({ node }: { node: FriendNode }) {
  const size = node.size
  return (
    <g className={`friendNode friendNode--${node.kind}`} transform={`translate(${node.x}, ${node.y})`}>
      {node.ring ? <circle className="friendNodePulse" r={size + 12} /> : null}
      <circle className="friendNodeCore" r={size} />
      {node.kind !== 'accent' ? (
        <>
          <text className="friendNodeInitials" textAnchor="middle" dy="0.32em">
            {node.label}
          </text>
          {node.sublabel ? (
            <text className="friendNodeLabel" textAnchor="middle" y={size + 20}>
              {node.sublabel}
            </text>
          ) : null}
        </>
      ) : null}
    </g>
  )
}

export default function NetworkBackground() {
  return (
    <div className="networkBackground" aria-hidden="true">
      <svg
        className="networkBackgroundSvg"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="networkBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--network-bg-left)" />
            <stop offset="55%" stopColor="var(--network-bg-center)" />
            <stop offset="100%" stopColor="var(--network-bg-right)" />
          </linearGradient>

          <radialGradient id="networkGlowGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--network-glow-green)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--network-glow-green)" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="networkGlowBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--network-glow-blue)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--network-glow-blue)" stopOpacity="0" />
          </radialGradient>

          <filter id="networkSoftBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* base gradient */}
        <rect x="0" y="0" width="1280" height="720" fill="url(#networkBgGradient)" />

        {/* soft blurred glows */}
        <g filter="url(#networkSoftBlur)">
          <circle cx="210" cy="170" r="130" fill="url(#networkGlowBlue)" className="haloFloat haloFloat--slow" />
          <circle cx="630" cy="235" r="150" fill="url(#networkGlowGreen)" className="haloFloat haloFloat--mid" />
          <circle cx="1000" cy="180" r="165" fill="url(#networkGlowBlue)" className="haloFloat haloFloat--slow" />
          <circle cx="1080" cy="500" r="155" fill="url(#networkGlowGreen)" className="haloFloat haloFloat--mid" />
        </g>

        {/* cluster halos */}
        <g className="clusterHalos">
          <BackgroundHalo className="clusterHalo clusterHalo--blue" cx={195} cy={210} rx={190} ry={145} />
          <BackgroundHalo className="clusterHalo clusterHalo--green" cx={560} cy={210} rx={220} ry={165} />
          <BackgroundHalo className="clusterHalo clusterHalo--blue" cx={1010} cy={240} rx={220} ry={170} />
        </g>

        {/* connection lines */}
        <g className="networkLinks">
          {links.map((link, index) => {
            const from = nodeById.get(link.from)
            const to = nodeById.get(link.to)
            if (!from || !to) return null
            const path = curvedPath(from, to, link.bend ?? 0)

            return (
              <g key={link.id}>
                <path
                  id={`path-${link.id}`}
                  className={`networkLink ${index % 3 === 0 ? 'networkLink--solid' : 'networkLink--dashed'}`}
                  d={path}
                />
                {link.pulse ? (
                  <circle className="networkPulse" r="4.5">
                    <animateMotion dur={`${12 + (index % 4) * 2}s`} repeatCount="indefinite" rotate="auto" path={path} />
                  </circle>
                ) : null}
              </g>
            )
          })}
        </g>

        {/* nodes */}
        <g className="networkNodes">
          {nodes.map((node) => (
            <PersonNode key={node.id} node={node} />
          ))}
        </g>

        {/* subtle floating micro points */}
        <g className="networkDust">
          <circle className="dust dust--one" cx="80" cy="110" r="3" />
          <circle className="dust dust--two" cx="350" cy="420" r="3.5" />
          <circle className="dust dust--three" cx="760" cy="140" r="2.5" />
          <circle className="dust dust--four" cx="980" cy="440" r="4" />
          <circle className="dust dust--five" cx="1180" cy="90" r="3" />
        </g>
      </svg>
    </div>
  )
}