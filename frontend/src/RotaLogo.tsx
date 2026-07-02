import React from 'react';

type RotaLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
};

export default function RotaLogo({
  size = 'md',
  showWordmark = false,
  showTagline = true,
  className = '',
}: RotaLogoProps) {
  return (
    <div className={`rotaLogoLockup rotaLogoLockup--${size} ${className}`.trim()}>
      <div className="rotaLogoMark" aria-label="Rota logo">
        <div className="rotaLogoMarkInner">
          <span className="rotaLogoText">ROTA</span>
          <span className="rotaOrbit" aria-hidden="true" />
          <span className="rotaOrbitDot" aria-hidden="true" />
        </div>
      </div>

      {(showWordmark || showTagline) && (
        <div className="rotaLogoMeta">
          {showWordmark ? <div className="rotaLogoWordmark">Rota</div> : null}
          {showTagline ? (
            <div className="rotaLogoTagline">0% interest circles</div>
          ) : null}
        </div>
      )}
    </div>
  );
}