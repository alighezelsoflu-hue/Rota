type RotaLogoProps = {
  size?: 'small' | 'large'
  showTagline?: boolean
  showText?: boolean
}

export default function RotaLogo({
  size = 'small',
  showTagline,
  showText,
}: RotaLogoProps) {
  const displayTagline = showTagline ?? showText ?? true

  return (
    <div className={`rotaLogo ${size === 'large' ? 'large' : ''}`} aria-label="Rota logo">
      <div className="rotaAppMark" aria-hidden="true">
        <div className="rotaCycleRing">
          <span />
        </div>

        <div className="rotaLetters">
          <span>R</span>
          <span>O</span>
          <span>T</span>
          <span>A</span>
        </div>

        <div className="rotaCycleDot" />
      </div>

      {displayTagline && (
        <div className="rotaLogoTagline">
          <strong>0% interest circles</strong>
        </div>
      )}
    </div>
  )
}