import React from 'react';

export default function CircleExampleCard() {
  return (
    <section className="circleExampleCard">
      <div className="circleExampleTop">
        <div className="circleExampleEyebrow">Circle example</div>
        <div className="circleExampleBadge">0% interest</div>
      </div>

      <h3 className="circleExampleTitle">One member receives each cycle</h3>

      <div className="circleExampleReceiver">
        <div className="circleExampleReceiverLabel">Receiver this cycle</div>
        <div className="circleExampleReceiverValue">Member 3 receives the pot</div>
        <p className="circleExampleReceiverNote">
          Contributors pay the receiver directly outside Rota.
        </p>
      </div>

      <div className="circleExampleStats">
        <div className="circleExampleStat">
          <span className="circleExampleStatLabel">Target pot</span>
          <strong>€1,000</strong>
        </div>
        <div className="circleExampleStat">
          <span className="circleExampleStatLabel">Confirmed</span>
          <strong>€800</strong>
        </div>
        <div className="circleExampleStat">
          <span className="circleExampleStatLabel">Progress</span>
          <strong>80%</strong>
        </div>
      </div>

      <div className="circleExampleProgress">
        <div className="circleExampleProgressBar">
          <span style={{ width: '80%' }} />
        </div>
      </div>

      <div className="circleExampleList">
        <div className="circleExampleRow">
          <span className="circleExampleDot circleExampleDot--green" />
          <span className="circleExampleAction">Member 1 uploaded proof</span>
          <span className="circleExampleStatus circleExampleStatus--ok">Confirmed</span>
        </div>

        <div className="circleExampleRow">
          <span className="circleExampleDot circleExampleDot--green" />
          <span className="circleExampleAction">Member 2 paid by transfer</span>
          <span className="circleExampleStatus circleExampleStatus--ok">Confirmed</span>
        </div>

        <div className="circleExampleRow">
          <span className="circleExampleDot circleExampleDot--amber" />
          <span className="circleExampleAction">Member 4 uploaded proof</span>
          <span className="circleExampleStatus circleExampleStatus--wait">Waiting</span>
        </div>

        <div className="circleExampleRow">
          <span className="circleExampleDot circleExampleDot--red" />
          <span className="circleExampleAction">Member 5 has not paid</span>
          <span className="circleExampleStatus circleExampleStatus--pending">Pending</span>
        </div>
      </div>
    </section>
  );
}