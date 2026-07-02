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

const desktopNodes: FriendNode[] = [
  { id: 'a', x: 120, y: 180, label: 'AL', sublabel: 'Ali', size: 18, kind: 'person', ring: true },
  { id: 'b', x: 220, y: 130, label: 'SM', sublabel: 'Sara', size: 16, kind: 'person' },
  { id: 'c', x: 260, y: 240, label: 'FR', sublabel: 'Friends', size: 26, kind: 'group', ring: true },
  { id: 'd', x: 160, y: 310, label: 'LN', sublabel: 'Lina', size: 16, kind: 'person' },

  { id: 'e', x: 470, y: 170, label: 'AM', sublabel: 'Amina', size: 17, kind: 'person' },
  { id: 'f', x: 580, y: 110, label: 'FA', sublabel: 'Family', size: 28, kind: 'group', ring: true },
  { id: 'g', x: 640, y: 240, label: 'OM', sublabel: 'Omar', size: 16, kind: 'person' },
  { id: 'h', x: 500, y: 300, label: 'WK', sublabel: 'Work', size: 24, kind: 'group' },

  { id: 'i', x: 920, y: 180, label: 'SA', sublabel: 'Sara', size: 16, kind: 'person' },
  { id: 'j', x: 1040, y: 130, label: 'NW', sublabel: 'New circle', size: 26, kind: 'group', ring: true },
  { id: 'k', x: 1110, y: 260, label: 'DV', sublabel: 'David', size: 16, kind: 'person' },
  { id: 'l', x: 940, y: 330, label: 'CM', sublabel: 'Community', size: 28, kind: 'group' },

  { id: 'm', x: 355, y: 95, label: '', size: 8, kind: 'accent' },
  { id: 'n', x: 785, y: 95, label: '', size: 10, kind: 'accent' },
  { id: 'o', x: 1170, y: 370, label: '', size: 9, kind: 'accent' },
]

const desktopLinks: Link[] = [
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

const mobileNodes: FriendNode[] = [
  { id: 'center', x: 195, y: 310, label: 'RO', sublabel: 'Rota circle', size: 34, kind: 'group', ring: true },

  { id: 'a', x: 98, y: 230, label: 'AL', sublabel: 'Ali', size: 23, kind: 'person', ring: true },
  { id: 'b', x: 208, y: 180, label: 'SA', sublabel: 'Sara', size: 22, kind: 'person' },
  { id: 'c', x: 298, y: 250, label: 'OM', sublabel: 'Omar', size: 23, kind: 'person' },
  { id: 'd', x: 282, y: 390, label: 'LN', sublabel: 'Lina', size: 22, kind: 'person' },
  { id: 'e', x: 120, y: 410, label: 'AM', sublabel: 'Amina', size: 22, kind: 'person' },

  { id: 'family', x: 92, y: 560, label: 'FA', sublabel: 'Family', size: 28, kind: 'group', ring: true },
  { id: 'friends', x: 294, y: 560, label: 'FR', sublabel: 'Friends', size: 28, kind: 'group', ring: true },

  { id: 'x1', x: 42, y: 142, label: '', size: 8, kind: 'accent' },
  { id: 'x2', x: 344, y: 142, label: '', size: 9, kind: 'accent' },
  { id: 'x3', x: 340, y: 686, label: '', size: 8, kind: 'accent' },
]

const mobileLinks: Link[] = [
  { id: 'ca', from: 'center', to: 'a', bend: 14, pulse: true },
  { id: 'cb', from: 'center', to: 'b', bend: -16 },
  { id: 'cc', from: 'center', to: 'c', bend: -14, pulse: true },
  { id: 'cd', from: 'center', to: 'd', bend: 18 },
  { id: 'ce', from: 'center', to: 'e', bend: -18, pulse: true },

  { id: 'ab', from: 'a', to: 'b', bend: -22 },
  { id: 'bc', from: 'b', to: 'c', bend: -18 },
  { id: 'cd2', from: 'c', to: 'd', bend: -14 },
  { id: 'de', from: 'd', to: 'e', bend: -18 },
  { id: 'ea', from: 'e', to: 'a', bend: -18 },

  { id: 'cfam', from: 'center', to: 'family', bend: 34, pulse: true },
  { id: 'cfr', from: 'center', to: 'friends', bend: -34, pulse: true },
  { id: 'famfr', from: 'family', to: 'friends', bend: -28 },
]

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

function PersonNode({ node }: { node: FriendNode }) {
  return (
    <g className={`friendNode friendNode--${node.kind}`} transform={`translate(${node.x}, ${node.y})`}>
      {node.ring && <circle className="friendNodePulse" r={node.size + 13} />}
      <circle className="friendNodeCore" r={node.size} />

      {node.kind !== 'accent' && (
        <>
          <text className="friendNodeInitials" textAnchor="middle" dy="0.32em">
            {node.label}
          </text>

          {node.sublabel && (
            <text className="friendNodeLabel" textAnchor="middle" y={node.size + 20}>
              {node.sublabel}
            </text>
          )}
        </>
      )}
    </g>
  )
}

function NetworkLayer({
  nodes,
  links,
  viewBox,
  className,
  mobile = false,
}: {
  nodes: FriendNode[]
  links: Link[]
  viewBox: string
  className: string
  mobile?: boolean
}) {
  const nodeById = new Map(nodes.map(node => [node.id, node]))

  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={mobile ? 'networkBgGradientMobile' : 'networkBgGradient'} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--network-bg-left)" />
          <stop offset="55%" stopColor="var(--network-bg-center)" />
          <stop offset="100%" stopColor="var(--network-bg-right)" />
        </linearGradient>

        <radialGradient id={mobile ? 'networkGlowGreenMobile' : 'networkGlowGreen'} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--network-glow-green)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--network-glow-green)" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={mobile ? 'networkGlowBlueMobile' : 'networkGlowBlue'} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--network-glow-blue)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--network-glow-blue)" stopOpacity="0" />
        </radialGradient>

        <filter id={mobile ? 'networkSoftBlurMobile' : 'networkSoftBlur'} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={mobile ? '14' : '18'} />
        </filter>
      </defs>

      <rect
        x="0"
        y="0"
        width={mobile ? '390' : '1280'}
        height={mobile ? '820' : '720'}
        fill={`url(#${mobile ? 'networkBgGradientMobile' : 'networkBgGradient'})`}
      />

      {mobile ? (
        <g filter="url(#networkSoftBlurMobile)">
          <circle cx="195" cy="310" r="160" fill="url(#networkGlowGreenMobile)" className="haloFloat haloFloat--mid" />
          <circle cx="86" cy="118" r="110" fill="url(#networkGlowBlueMobile)" className="haloFloat haloFloat--slow" />
          <circle cx="320" cy="660" r="130" fill="url(#networkGlowGreenMobile)" className="haloFloat haloFloat--slow" />
        </g>
      ) : (
        <g filter="url(#networkSoftBlur)">
          <circle cx="210" cy="170" r="130" fill="url(#networkGlowBlue)" className="haloFloat haloFloat--slow" />
          <circle cx="630" cy="235" r="150" fill="url(#networkGlowGreen)" className="haloFloat haloFloat--mid" />
          <circle cx="1000" cy="180" r="165" fill="url(#networkGlowBlue)" className="haloFloat haloFloat--slow" />
          <circle cx="1080" cy="500" r="155" fill="url(#networkGlowGreen)" className="haloFloat haloFloat--mid" />
        </g>
      )}

      <g className="clusterHalos">
        {mobile ? (
          <>
            <ellipse className="clusterHalo clusterHalo--green" cx="195" cy="310" rx="165" ry="205" />
            <ellipse className="clusterHalo clusterHalo--blue" cx="195" cy="560" rx="175" ry="90" />
          </>
        ) : (
          <>
            <ellipse className="clusterHalo clusterHalo--blue" cx="195" cy="210" rx="190" ry="145" />
            <ellipse className="clusterHalo clusterHalo--green" cx="560" cy="210" rx="220" ry="165" />
            <ellipse className="clusterHalo clusterHalo--blue" cx="1010" cy="240" rx="220" ry="170" />
          </>
        )}
      </g>

      <g className="networkLinks">
        {links.map((link, index) => {
          const from = nodeById.get(link.from)
          const to = nodeById.get(link.to)
          if (!from || !to) return null

          const path = curvedPath(from, to, link.bend ?? 0)

          return (
            <g key={link.id}>
              <path
                className={`networkLink ${index % 3 === 0 ? 'networkLink--solid' : 'networkLink--dashed'}`}
                d={path}
              />

              {link.pulse && (
                <circle className="networkPulse" r={mobile ? '5.5' : '4.5'}>
                  <animateMotion
                    dur={`${mobile ? 10 : 12 + (index % 4) * 2}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    path={path}
                  />
                </circle>
              )}
            </g>
          )
        })}
      </g>

      <g className="networkNodes">
        {nodes.map(node => (
          <PersonNode key={node.id} node={node} />
        ))}
      </g>
    </svg>
  )
}

export default function NetworkBackground() {
  return (
    <div className="networkBackground" aria-hidden="true">
      <NetworkLayer
        nodes={desktopNodes}
        links={desktopLinks}
        viewBox="0 0 1280 720"
        className="networkBackgroundSvg networkBackgroundSvg--desktop"
      />

      <NetworkLayer
        nodes={mobileNodes}
        links={mobileLinks}
        viewBox="0 0 390 820"
        className="networkBackgroundSvg networkBackgroundSvg--mobile"
        mobile
      />
    </div>
  )
}