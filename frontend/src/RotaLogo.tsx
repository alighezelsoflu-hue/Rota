type RotaLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'small' | 'large'
  showWordmark?: boolean
  showTagline?: boolean
  showText?: boolean
  className?: string
}

function normalizeSize(size: RotaLogoProps['size']) {
  if (size === 'small') return 'sm'
  if (size === 'large') return 'lg'
  return size || 'md'
}

export default function RotaLogo({
  size = 'md',
  showWordmark = false,
  showTagline,
  showText,
  className = '',
}: RotaLogoProps) {
  const normalizedSize = normalizeSize(size)
  const displayTagline = showTagline ?? showText ?? true

  return (
    <div className={`rotaLogoLockup rotaLogoLockup--${normalizedSize} ${className}`.trim()}>
      <div className="rotaLogoMark" aria-label="Rota logo">
        <div className="rotaLogoMarkInner">
          <span className="rotaLogoOrbitPath" aria-hidden="true" />
          <span className="rotaLogoText">ROTA</span>
          <span className="rotaOrbitDot" aria-hidden="true" />
        </div>
      </div>

      {(showWordmark || displayTagline) && (
        <div className="rotaLogoMeta">
          {showWordmark && <div className="rotaLogoWordmark">Rota</div>}
          {displayTagline && <div className="rotaLogoTagline">0% interest circles</div>}
        </div>
      )}
    </div>
  )
}