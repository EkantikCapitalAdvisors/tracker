import Link from 'next/link';
import { MarkManualSeen } from '@/components/FirstVisitBanner';

export const metadata = {
  title: 'Investor Manual — The Correction Dashboard',
};

/* Static investor manual — source: Market_Positioning_Investor_Manual.docx (Jul 18, 2026). */

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-lg font-semibold">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-navy/80">{children}</p>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-2 text-left text-xs uppercase tracking-wide text-navy/60">{children}</th>;
}
function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`p-2 align-top text-sm ${strong ? 'font-semibold' : 'text-navy/80'}`}>{children}</td>;
}

export default function InvestorManualPage() {
  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <MarkManualSeen />

      <header className="border-b border-navy/15 pb-6">
        <p className="text-xs uppercase tracking-widest text-navy/50">
          Ekantik Capital Advisors — Correction Intelligence Program
        </p>
        <h1 className="mt-1 text-3xl">The Correction Dashboard</h1>
        <p className="mt-1 text-xl text-navy/80">
          Investor Manual — Market Positioning &amp; Allocation Decisions
        </p>
        <p className="mt-2 text-sm text-navy/60">
          How the positioning system works, why every level is published in advance, and what it
          asks of your equity allocation.
        </p>
        <p className="mt-2 text-xs text-navy/50">
          tracker.ekantikcapital.com/dashboard/positioning · July 18, 2026 · Thresholds set by{' '}
          <em>The Anatomy of Correction Depth</em> (54 events, 1974–2026) · Dashboard Spec v1.0
        </p>
      </header>

      <section className="mt-6 rounded-lg border border-navy/15 bg-navy p-6 text-ivory">
        <p className="font-heading text-xl">Measure the seller, not the headline.</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-ivory/60">
          Tier state machine · Frozen thresholds · Pre-committed deployment ladder
        </p>
        <p className="mt-3 text-sm text-ivory/85">
          Every allocation level on this dashboard was published before the event that triggers it.
          Same inputs, same answer — there is no discretionary score, and there is nothing to
          second-guess at 3 a.m. during a drawdown.
        </p>
      </section>

      <H>1. Why This Dashboard Exists</H>
      <P>
        Most investors lose money in corrections twice. Once on the way down — because they hold
        through the declines that matter — and once on the way back up, because they sell the
        declines that don&rsquo;t matter and re-enter late. The industry&rsquo;s answer is
        judgment: a strategist&rsquo;s gut, a committee&rsquo;s debate, a feeling about the tape.
        Judgment is precisely the faculty that fails under stress.
      </P>
      <P>
        The Correction Dashboard is our answer, and it is different in kind, not degree. Every
        threshold that moves your equity deployment was fixed by a 50-year backtest of 54
        correction events (1974–2026) before the first live reading was ever taken. The rules are
        frozen. The ladder is published. When the market falls, the system does not form an
        opinion — it reports which pre-committed rule applies and what specific closing price
        would change it.
      </P>
      <P>
        This is radical transparency applied to the hardest problem in investing: you can see,
        today, exactly what we would do at −5%, at −10%, at −20%, and exactly why. Nothing else
        about the ladder moves.
      </P>

      <H>2. The Doctrine: Depth Is Set by Who Is Selling</H>
      <P>
        Corrections are not one phenomenon. Fifty years of evidence says depth is determined by
        which class of seller the catalyst activates — not by the scariness of the headline. Three
        seller classes hold nearly all U.S. equity assets, and each has a different decision rule:
      </P>
      <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
        <table className="w-full">
          <thead className="bg-navy/5">
            <tr>
              <Th>Seller class</Th>
              <Th>Share of assets</Th>
              <Th>Typical depth</Th>
              <Th>What makes them sell</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-navy/10">
              <Td strong>Speculative capital</Td>
              <Td>≈ 7%</Td>
              <Td>1–5%</Td>
              <Td>Positioning, sentiment, technical breaks</Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>Fundamental repricing</Td>
              <Td>≈ 40%</Td>
              <Td>5–15%</Td>
              <Td>Downward revisions to earnings power</Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>Buy-and-hold capitulation</Td>
              <Td>≈ 50%</Td>
              <Td>15–50%+</Td>
              <Td>Recession fear reaching household portfolios</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <P>
        A fourth class — mechanical and systematic sellers (volatility-control funds, risk parity,
        trend followers, dealer hedging) — sells by formula rather than belief and sets the
        velocity of modern declines, not their final depth.
      </P>
      <P>
        One more variable acts as the master switch: the policy reaction function. When inflation
        is above 4%, the Federal Reserve loses the freedom to rescue markets — and in ten out of
        ten historical cases, that constraint decided whether a fundamental repricing was allowed
        to cascade into capitulation. Median correction depth with a constrained Fed: 13.9%. With
        a free Fed: 9.4%.
      </P>
      <P>
        Every signal on the dashboard exists to answer one question:{' '}
        <em>which seller class is active right now, and is the next one being activated?</em> That
        is what the tier state measures.
      </P>

      <H>3. Reading the Dashboard</H>
      <H3>3.1 The Tier State — One Number That Means Something</H3>
      <P>
        The banner at the top shows a single state. It maps one-to-one onto the seller taxonomy,
        so the label itself is the depth hypothesis:
      </P>
      <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
        <table className="w-full">
          <thead className="bg-navy/5">
            <tr>
              <Th>State</Th>
              <Th>Entry condition (frozen)</Th>
              <Th>What it means for you</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-navy/10">
              <Td strong>TIER 0</Td>
              <Td>No close ≤ −5.0% below the 6-month closing high</Td>
              <Td>
                Baseline. Fully deployed. Roughly one qualifying event per year historically —
                most weeks are this week.
              </Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>TIER 1</Td>
              <Td>First close ≤ −5.0% below the cycle high</Td>
              <Td>
                Speculative unwind. The 30/60-trading-day recovery windows open; the catalyst is
                tagged. Most events die here — 27 of the 54 never reached −10%.
              </Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>TIER 2</Td>
              <Td>Close ≤ −10.0%, OR a failed recovery combined with widening credit spreads</Td>
              <Td>
                Fundamental repricing. Earnings expectations — not just positioning — are moving.
                The depth engine publishes a range and an invalidation level.
              </Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>TIER 3</Td>
              <Td>Close ≤ −20.0%, OR labor-market deterioration + credit crisis + constrained Fed</Td>
              <Td>
                Capitulation. The largest seller class is moving. Exits are condition-based, never
                price guesses.
              </Td>
            </tr>
          </tbody>
        </table>
      </div>

      <H3>3.2 The Drivers Panel — Why the Level Is What It Is</H3>
      <P>
        Beneath the state, six drivers show exactly which frozen rules are pushing deployment up
        or down. Each is a plain reading against a published threshold — hover any driver on the
        dashboard for the full theory and precedent. In plain language:
      </P>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-navy/80">
        <li>
          <span className="font-semibold">Credit impulse.</span> The spread between Baa corporate
          bond yields and 10-year Treasuries, measured as its 3-month change. A widening of +50
          basis points or more is the single most reliable depth signal in the dataset —
          correlation of +0.65 with final correction depth, present in 92% of major episodes.
          Credit is the fundamental seller&rsquo;s footprint.
        </li>
        <li>
          <span className="font-semibold">Credit crisis.</span> The same spread above 250 basis
          points outright. This level has historically confirmed capitulation-regime conditions.
        </li>
        <li>
          <span className="font-semibold">Policy switch.</span> CPI inflation above 4%
          year-over-year = CONSTRAINED. The Fed put is unavailable, and the published depth range
          shifts to the upper half of its band.
        </li>
        <li>
          <span className="font-semibold">Sahm gate.</span> A real-time recession signal built
          from the unemployment rate. It arms at 0.50 and fires only with confirming deterioration
          in jobless claims and earnings revisions. This is the discriminator between a deep
          correction and a recessionary bear.
        </li>
        <li>
          <span className="font-semibold">Failed-recovery router.</span> After any −5% close, the
          market gets 30 trading days to regain its high. Failure, followed by a lower low within
          60 trading days, historically raised the probability of a ≥10% decline from 7% to 58% —
          an eight-fold jump. This is the single most valuable early-warning signal in the system.
        </li>
        <li>
          <span className="font-semibold">Tier / router status.</span> The current state and
          whether the recovery windows are open, escalated, or inactive.
        </li>
      </ul>
      <P>
        Just as important is what the dashboard deliberately excludes: indicators that failed the
        causation tests. Time since the last correction, standalone interest-rate shocks,
        put/call ratios, and survey sentiment carry no weight anywhere in the system — a
        discipline most commentary never applies.
      </P>

      <H>4. The Deployment Ladder — Published in Advance</H>
      <P>
        The heart of the positioning page. Seven levels, each tied to a frozen rule, each with its
        rationale printed beside it. The highlighted row is where the state machine puts us today;
        nothing else about the ladder ever moves. Percentages refer to deployment of the equity
        sleeve — 100% means your portfolio&rsquo;s normal full equity weight, not your total net
        worth.
      </P>
      <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
        <table className="w-full">
          <thead className="bg-navy/5">
            <tr>
              <Th>Deployment</Th>
              <Th>When (frozen rules)</Th>
              <Th>Why — the evidence</Th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['100%', 'Tier 0 — no qualifying event', 'Fully invested. Nothing is sold on headlines — only on a −5% close. The cost of standing aside in Tier 0 compounds against you.'],
                ['85%', 'Tier 1 · recovery windows open (first −5% close, bounce undecided)', 'Trim the speculative sleeve; hold core. Half of all catalog events died short of −10% — hard de-risking on every −5% is the historically losing move.'],
                ['70%', 'Tier 1 · failed recovery (no regain in 30 days + lower low)', 'Reduce to core. P(≥10%) jumps to 58% vs 7% on clean recoveries. The seller is persistent — respect it before the −10% print, not after.'],
                ['55%', 'Tier 2 — fundamental repricing (Fed free, credit quiet)', 'Half deployed; stage re-entry orders. With policy free and credit quiet, the historical median resolves shallow — half-in beats flat.'],
                ['40%', 'Tier 2 + constrained Fed or credit widening', 'Defensive core. The two depth multipliers are live: CPI > 4% removes the Fed put (13.9% vs 9.4% median) and credit carries ρ = +0.65 to final depth.'],
                ['25%', 'Tier 3 — capitulation (close ≤ −20%)', 'Defensive floor. Tier-3 entries are historically closer to the bottom than the top — the floor stays invested, but adding waits for exit conditions, never a price guess.'],
                ['0%', 'Tier 3 + recession signal fired + credit crisis + constrained Fed', 'Flat — full defense. Every leg of the non-price Tier-3 entry confirmed at once. This is the 1973–74 (−48%) and 2007–09 (−57%) profile — the only regimes in 50 years where flat beat every partial deployment.'],
              ] as const
            ).map(([pct, when, why]) => (
              <tr key={pct} className="border-t border-navy/10">
                <Td strong>{pct}</Td>
                <Td>{when}</Td>
                <Td>{why}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H>5. When to Reduce — The Decision Rules</H>
      <P>
        The question every investor actually asks is <em>when do I sell?</em> The ladder answers
        it with four rules, each earned by the data:
      </P>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-navy/80">
        <li>
          <span className="font-semibold">Rule 1 — Never on a headline.</span> No news event,
          however alarming, changes deployment. Only a closing price ≤ −5% below the cycle high
          does. The 2026 Iran/oil shock produced terrifying headlines and a −9% event that fully
          recovered; the dashboard treated it as exactly what the rules said it was.
        </li>
        <li>
          <span className="font-semibold">Rule 2 — First reduction is a trim, not an exit.</span>{' '}
          At the first −5% close, deployment steps to 85%: leverage and momentum positions go,
          core holdings stay. Because half of all historical events end here, selling everything
          at −5% is the single most expensive habit in retail investing — you pay full drawdown
          insurance for events that recover in weeks.
        </li>
        <li>
          <span className="font-semibold">Rule 3 — The failed bounce is the real signal.</span> If
          the market cannot regain its high within 30 trading days and then makes a lower low,
          deployment steps to 70% before the −10% print. This is where the system earns its keep:
          it de-risks on evidence of a persistent seller, not on fear.
        </li>
        <li>
          <span className="font-semibold">Rule 4 — Depth multipliers drive the deep cuts.</span>{' '}
          Below −10%, the difference between 55% and 40% deployed — and later between 25% and 0% —
          is decided by the policy switch, credit spreads, and the labor market, because those are
          the variables that decide whether household capital capitulates. Price alone never takes
          the ladder to zero; only the full recessionary stack does.
        </li>
      </ul>
      <P>
        Notice what this structure buys you: at every step, the reduction happens for a stated,
        checkable reason, and the dashboard shows the exact close or data print that would trigger
        the next step. You are never asked to trust a mood.
      </P>

      <H>6. When to Re-Enter — The Ladder in Reverse</H>
      <P>
        Getting out is half the problem; most investors who de-risk never get back in on time.
        Re-entry follows the same frozen rules, in reverse:
      </P>
      <div className="mt-3 overflow-x-auto rounded-lg border border-navy/15 bg-white">
        <table className="w-full">
          <thead className="bg-navy/5">
            <tr>
              <Th>De-escalation</Th>
              <Th>Condition (frozen)</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-navy/10">
              <Td strong>Tier 1 → 0</Td>
              <Td>
                The market regains its cycle high, or the 30-trading-day window closes with no
                lower low.
              </Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>Tier 2 → 1</Td>
              <Td>
                A 50% retrace of the decline while credit spreads are no longer widening (3-month
                change ≤ 0).
              </Td>
            </tr>
            <tr className="border-t border-navy/10">
              <Td strong>Tier 3 exit</Td>
              <Td>
                A confirmed higher low plus four consecutive weeks of credit-spread narrowing. The
                seller — credit — must stand down for a month. The system will not call a bottom
                from price alone.
              </Td>
            </tr>
          </tbody>
        </table>
      </div>
      <P>
        Deployment steps back up as the state machine de-escalates. It never front-runs price, and
        it never waits for comfort — it waits for the specific conditions that historically marked
        durable bottoms.
      </P>

      <H>7. What the Dashboard Will Never Do</H>
      <P>
        A system is defined as much by its refusals as its rules. This one refuses to: publish a
        point estimate of depth (always a range with an invalidation level); fire any signal on
        intraday prices or estimates (closing and official data only); let the VIX or any fear
        gauge change state (symptomatic confirmers grade the decline the market is already in —
        they never trigger); apply a discretionary override, ever; or soften a triggered reading
        because it is inconvenient.
      </P>
      <P>
        And one refusal that matters most: the thresholds themselves cannot be quietly changed.
        Any modification requires written justification, a 48-hour cooling-off period, and a
        countersignature. The rules you read today are the rules that will govern the next
        correction.
      </P>

      <H>8. How You Will Know If It Stops Working</H>
      <P>
        Every indicator on the dashboard carries a pre-committed retirement criterion, evaluated
        on live data — published before the fact, like everything else. If the credit impulse
        fires three consecutive times with no ≥10% event within nine months, it comes up for
        retirement. If the failed-recovery signal&rsquo;s live hit rate falls below 35% over ten
        escalations, it is re-estimated. Every triggered signal is logged in a public
        false-positive ledger with its nine-month outcome.
      </P>
      <P>
        We know of no other correction framework that publishes, in advance, the evidence that
        would kill its own signals. That is not a marketing flourish — it is the difference
        between a system you can audit and a narrative you have to believe. All dashboard claims
        remain framed as design intent under armed-but-unfired gates until a live track record
        exists, and the full backtest is re-run each January with the prior year&rsquo;s events
        appended.
      </P>

      <H>9. Using It in Practice</H>
      <P>
        <span className="font-semibold">Weekly, in Tier 0:</span> One glance. Confirm the state,
        note the vulnerability context (valuation tercile, policy posture), and note the specific
        close that would change state — the dashboard prints it for you. That is the entire
        obligation of a calm market.
      </P>
      <P>
        <span className="font-semibold">In Tier 1 and above:</span> The system escalates to daily
        cadence. Watch the recovery windows and the credit impulse — they decide whether this is
        one of the 27 events that die quietly or one that escalates.
      </P>
      <P>
        <span className="font-semibold">At every level:</span> Compare your own equity sleeve to
        the ladder. The percentages are the system&rsquo;s design intent for the strategy it
        governs; how they map to your circumstances, tax position, and liabilities is a
        conversation for you and your financial professional, not a formula.
      </P>
      <P>
        <span className="font-semibold">A worked example from this month:</span> as of July 17,
        2026, the S&amp;P sits 2.0% below its 7,610 cycle high — Tier 0, fully deployed. Policy
        has moved to FREE, credit is quiet, and the recovery router is inactive. The one number
        that matters: a close at or below 7,229 enters Tier 1 and steps deployment to 85%. Until
        that close prints, the pullback is noise by definition — and the dashboard says so out
        loud.
      </P>

      <H>10. Questions Investors Ask</H>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-navy/80">
        <p>
          <span className="font-semibold">Why not sell everything at −5%?</span> Because the data
          forbids it: half of all events since 1974 never reached −10%. Full de-risking at −5%
          buys expensive insurance against shallow events and forfeits the recoveries that follow.
          The ladder trims what falls hardest (the speculative sleeve) and lets the recovery
          windows arbitrate.
        </p>
        <p>
          <span className="font-semibold">Why stay 25% invested in a capitulation?</span> Because
          Tier-3 entries historically occur closer to bottoms than tops. Going to zero at −20% has
          usually meant selling to the buyers of the decade. The ladder only goes flat when the
          full recessionary stack — labor market, credit crisis, constrained Fed — confirms at
          once, the profile of 1973–74 and 2007–09.
        </p>
        <p>
          <span className="font-semibold">What if this correction is different?</span> The depth
          engine assumes it might be: it publishes ranges, not points, with an explicit
          invalidation level. And the retirement criteria assume the system itself might be wrong
          — every signal carries the evidence that would suspend it.
        </p>
        <p>
          <span className="font-semibold">Is this advice to buy or sell?</span> No. It is
          general-circulation research published under the publisher&rsquo;s exemption — the
          documented design intent of a rules-based strategy. It is not tailored to any
          individual&rsquo;s circumstances. Consult your own financial professional before acting
          on any of it.
        </p>
      </div>

      <H>The Standard Behind the System</H>
      <P>
        This dashboard exists because of a conviction that runs through everything Ekantik builds:
        investors deserve to see the machinery, not just the output. Full accountability means
        publishing the rules before the event. Radical transparency means logging the false
        positives next to the wins. Fiduciary discipline means the system&rsquo;s first job is
        defense — protect first, then compound.
      </P>
      <P>
        See the live state any time on the{' '}
        <Link href="/dashboard/positioning" className="text-gold underline">
          Market Positioning page
        </Link>
        , with every signal&rsquo;s theory and precedent one click deeper on the{' '}
        <Link href="/dashboard/correction" className="text-gold underline">
          Correction Dashboard
        </Link>
        . If you would like to walk through how the ladder&rsquo;s logic maps to your own
        allocation framework, we are glad to have that conversation — schedule a consultation at
        ekantikcapital.com.
      </P>
      <p className="mt-4 font-heading text-lg text-navy">
        Your Wealth. Our Accountability. Total Transparency.
      </p>

      {/* Hand-off: the reader is now ready for the live pages */}
      <div className="mt-8 flex flex-wrap gap-3 rounded-lg border border-gold/50 bg-gold/10 p-4">
        <Link
          href="/dashboard/positioning"
          className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-ivory transition-opacity hover:opacity-90"
        >
          You&rsquo;re ready — open Market Positioning →
        </Link>
        <Link
          href="/dashboard/correction"
          className="rounded-md border border-navy/30 px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
        >
          Or start with the evidence →
        </Link>
      </div>

      <section className="mt-10 rounded-lg border border-navy/15 bg-navy/[0.03] p-4 text-xs leading-relaxed text-navy/60">
        <p className="font-semibold uppercase tracking-wide">Important Disclosures</p>
        <p className="mt-2">
          This document is produced by Ekantik Capital Advisors LLC for research and informational
          purposes only. It describes the design and methodology of an internal research
          instrument and constitutes general-circulation research published under the
          publisher&rsquo;s exemption. It does not constitute personalized investment advice, a
          solicitation, or a recommendation to buy, sell, or hold any security, and it is not
          tailored to any recipient&rsquo;s individual financial circumstances. All backtested and
          historical statistics herein are hypothetical, derived from publicly available data, and
          subject to data-revision, survivorship, and look-ahead limitations. Deployment levels
          describe the design intent of a rules-based framework, not a guarantee of action or
          outcome; all framework claims remain design intent until a live track record exists.
          Past performance, including backtested results, does not guarantee future results. All
          investments carry risk, including potential loss of principal. Market data may be
          delayed. Investors should conduct their own due diligence and consult a qualified
          financial professional before making investment decisions.
        </p>
      </section>
    </main>
  );
}
