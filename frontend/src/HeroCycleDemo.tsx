import { Badge, Card } from './ui'

export default function HeroCycleDemo() {
  return (
    <Card className="heroCycleDemo premiumPanel">
      <div className="cycleDemoHeader">
        <div>
          <p className="eyebrow">Circle example</p>
          <h3>One member receives each cycle</h3>
        </div>

        <Badge tone="success" dot>
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
          <strong>Contributor 1</strong>
          <em>Proof confirmed</em>
        </div>

        <div>
          <span className="cycleDot success" />
          <strong>Contributor 2</strong>
          <em>Proof confirmed</em>
        </div>

        <div>
          <span className="cycleDot warning" />
          <strong>Contributor 3</strong>
          <em>Waiting for review</em>
        </div>

        <div>
          <span className="cycleDot danger" />
          <strong>Contributor 4</strong>
          <em>Pending proof</em>
        </div>
      </div>
    </Card>
  )
}