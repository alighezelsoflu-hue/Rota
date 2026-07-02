import React from 'react';
import RotaLogo from '../../components/brand/RotaLogo';
import CircleExampleCard from './CircleExampleCard';

export default function HomeHero() {
  return (
    <section className="homeHero">
      <div className="homeHeroGrid">
        <div className="homeHeroContent">
          <RotaLogo size="lg" showWordmark={false} showTagline />

          <p className="homeHeroKicker">
            Trusted groups • direct contributions • clear records
          </p>

          <h1 className="homeHeroTitle">
            Build trusted circles instead of paying bank interest
          </h1>

          <p className="homeHeroDescription">
            Join one or more trusted groups, contribute directly with people you
            know, and access interest-free circle financing with transparent
            records and shared responsibility.
          </p>

          <div className="homeHeroActions">
            <a href="/register" className="button button--primary">
              Create account
            </a>
            <a href="/login" className="button button--secondary">
              Log in
            </a>
          </div>
        </div>

        <div className="homeHeroVisual">
          <CircleExampleCard />
        </div>
      </div>
    </section>
  );
}