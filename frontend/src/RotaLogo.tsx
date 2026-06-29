type RotaLogoProps = {
  size?: 'small' | 'large'
  showText?: boolean
}

export default function RotaLogo({ size = 'small', showText = true }: RotaLogoProps) {
  return (
    <div className={`rotaLogo ${size === 'large' ? 'large' : ''}`} aria-label="Rota logo">
      <div className="rotaFocusMark">
        {['R', 'O', 'T', 'A'].map((letter, index) => (
          <span key={letter} style={{ ['--i' as string]: index }}>
            {letter}
          </span>
        ))}
        <i />
      </div>

      {showText && (
        <div className="rotaLogoText">
          <strong>Rota</strong>
          <small>0% interest circles</small>
        </div>
      )}
    </div>
  )
}