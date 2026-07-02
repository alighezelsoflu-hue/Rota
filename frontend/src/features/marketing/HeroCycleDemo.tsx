import { Badge, Card } from '../../components/ui/ui'

export default function HeroCycleDemo() {
  return (
    <Card className="heroCycleDemo premiumPanel">
      <div className="cycleDemoHeader">
        <div>
          <p className="eyebrow">Circle example</p>
          <h3>One member receives each cycle</h3>
        </div>

        <Badge tone="success" className="cycleInterestBadge">
          0% interest
        </Badge>
      </div>

      <div className="cycleDemoReceiver">
        <span>Receiver this cycle</span>
        <strong>Member 3 receives the pot</strong>
        <small>Contributors pay the receiver directly outside Rota.</small>
      </div>

      <div className="cycleDemoNumbers">
        <div>
          <span>Target pot</span>
          <strong>€1,000</strong>
        </div>

        <div>
          <span>Confirmed</span>
          <strong>€800</strong>
        </div>

        <div>
          <span>Progress</span>
          <strong>80%</strong>
        </div>
      </div>

      <div className="cycleDemoProgress" aria-label="80% confirmed">
        <span style={{ width: '80%' }} />
      </div>

      <div className="cycleDemoLedger">
        <div>
          <span className="cycleDot success" />
          <strong>Member 1</strong>
          <em>Confirmed</em>
        </div>

        <div>
          <span className="cycleDot success" />
          <strong>Member 2</strong>
          <em>Confirmed</em>
        </div>

        <div>
          <span className="cycleDot warning" />
          <strong>Member 4</strong>
          <em>Reviewing</em>
        </div>

        <div>
          <span className="cycleDot danger" />
          <strong>Member 5</strong>
          <em>Pending</em>
        </div>
      </div>
    </Card>
  )
}