type RotaLogoProps = {
  size?: 'small' | 'large'
  showTagline?: boolean
}

export default function RotaLogo({ size = 'small', showTagline = true }: RotaLogoProps) {
  return (
    <div className={`rotaLogo ${size === 'large' ? 'large' : ''}`} aria-label="Rota logo">
      <div className="rotaAppMark">
        <div className="rotaOrbit" />
        <div className="rotaLetters" aria-hidden="true">
          <span>R</span>
          <span>O</span>
          <span>T</span>
          <span>A</span>
        </div>
        <div className="rotaCoreDot" />
      </div>

      {showTagline && (
        <div className="rotaLogoTagline">
          <strong>0% interest circles</strong>
        </div>
      )}
    </div>
  )
}