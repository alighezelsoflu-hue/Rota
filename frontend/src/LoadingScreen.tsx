import RotaLogo from './RotaLogo'

type Props = {
  title?: string
  subtitle?: string
}

export default function LoadingScreen({
  title = 'Loading Rota',
  subtitle = 'Preparing your trusted circles...',
}: Props) {
  return (
    <section className="rotaLoadingScreen" aria-live="polite" aria-busy="true">
      <div className="rotaLoadingCard">
        <RotaLogo size="large" showTagline={false} />

        <div className="rotaLoadingText">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="rotaLoadingBar" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  )
}