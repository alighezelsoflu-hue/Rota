export default function NetworkBackground() {
  return (
    <div className="networkBackground" aria-hidden="true">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="none">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34,197,94,0.32)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0)" />
          </radialGradient>
        </defs>

        <g className="networkLines">
          <path d="M90 170 C260 90, 410 140, 560 230 S850 420, 1090 300" />
          <path d="M160 620 C360 470, 520 510, 690 380 S910 160, 1140 190" />
          <path d="M260 250 C420 320, 520 230, 690 280 S900 480, 1050 610" />
          <path d="M70 430 C260 390, 390 530, 540 470 S740 260, 930 350" />
          <path d="M390 100 C430 260, 560 340, 700 430 S820 570, 930 720" />
        </g>

        <g className="networkNodes">
          <circle cx="90" cy="170" r="8" />
          <circle cx="260" cy="250" r="12" />
          <circle cx="390" cy="100" r="7" />
          <circle cx="560" cy="230" r="15" />
          <circle cx="690" cy="380" r="10" />
          <circle cx="930" cy="350" r="16" />
          <circle cx="1090" cy="300" r="8" />
          <circle cx="160" cy="620" r="10" />
          <circle cx="540" cy="470" r="13" />
          <circle cx="930" cy="720" r="9" />
        </g>

        <g className="networkPots">
          <circle cx="560" cy="230" r="46" />
          <circle cx="930" cy="350" r="54" />
          <circle cx="540" cy="470" r="42" />
        </g>
      </svg>
    </div>
  )
}