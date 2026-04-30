import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

export default function DetailsPage() {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <SiteHeader variant="details" />

      <main className="flex-grow w-full pt-8 pb-xxl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 mb-xl">
          <div className="w-full h-[400px] md:h-[500px] rounded-DEFAULT overflow-hidden bg-surface-container relative">
            <img
              alt="AI Analysis Cover Image"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdtEj_CylvwWfLuSy5pII9gp21Fyd_REKpSZAScbNGL-flYXkWJLW5MYR_nOmQbFEF6FhE2cB9l2H8Ex2pId0Q_KD4J9kf8kzRgRz4O25WgLSYmZMyhQzVm4nUXU9KgnGQ818qQSp_rhHmT5AS0_nZ1BmSfBDK0uMqJDQpOpPa_-CQcOCBcH9GWvtcxZ_xupi3EP2kH3q5SFdoUoA1iqomwAjDxSIgwnpeAUptUq3NVf52e7LFQdz2kkVkLGRD89pGYckolhjh9p8"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12">
              <span className="inline-block bg-white/90 text-primary font-label-sm text-label-sm px-3 py-1 rounded-DEFAULT mb-4">
                AI GENERATED REPORT
              </span>
            </div>
          </div>
        </div>

        <article className="max-w-[720px] mx-auto px-4 md:px-0 markdown-content">
          <h1>The Future of Supply Chain Resilience in a Post-Globalized Economy</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant italic mb-12">
            Generated on October 24, 2024. This analysis was synthesized using proprietary AI models
            drawing from 1,200 recent economic policy papers and industry journals.
          </p>
          <h2>Executive Summary</h2>
          <p>
            The global supply chain paradigm is undergoing a fundamental structural shift. The
            long-standing focus on &quot;just-in-time&quot; manufacturing and absolute cost-efficiency is being
            rapidly replaced by &quot;just-in-case&quot; strategies emphasizing resilience, regionalization, and
            deep-tier visibility. This analysis indicates that organizations failing to adapt to this
            multi-nodal, de-risked model face an existential threat within the next 36 months, driven
            by increasing geopolitical friction, climate-induced disruptions, and shifting trade
            policies.
          </p>
          <h2>Key Findings</h2>
          <h3>1. The Transition from Globalization to &quot;Friendshoring&quot;</h3>
          <p>
            Our analysis detects a 40% increase in capital allocation towards nearshoring and
            &quot;friendshoring&quot; initiatives among Fortune 500 manufacturing firms over the past four
            quarters. This is not merely a temporary adjustment but a strategic realignment. The
            primary driver is the need to secure critical components within politically stable and
            allied geographic spheres, mitigating the risk of sudden embargoes or tariff spikes.
          </p>
          <h3>2. The Imperative of Deep-Tier Visibility (N-Tier Tracking)</h3>
          <p>
            Traditional supply chain management focused heavily on Tier 1 suppliers. Current data
            suggests that 85% of recent disruptive shocks originated in Tier 2 or Tier 3 of the supply
            chain. Modern resilience requires comprehensive N-Tier visibility. However, adoption rates
            for advanced tracking technologies (such as blockchain-enabled provenance and AI-driven
            predictive risk modeling) remain concerningly low at approximately 22% across major
            industries.
          </p>
          <ul>
            <li>
              <strong>Data Silos:</strong> The largest barrier to N-Tier visibility remains legacy IT
              infrastructure and inter-organizational data hoarding.
            </li>
            <li>
              <strong>Predictive Failure:</strong> Current reactive models cost companies an average of
              1.4% of annual revenue per disruption event.
            </li>
          </ul>
          <h3>3. Environmental Stressors as Primary Risk Vectors</h3>
          <p>
            Climate change is no longer a peripheral ESG concern but a core operational risk. The
            frequency of extreme weather events disrupting major shipping lanes and key manufacturing
            hubs (particularly in Southeast Asia) has doubled in the last decade. Predictive models
            suggest a high probability of severe, concurrent climate events affecting multiple critical
            nodes simultaneously by 2030.
          </p>
          <h2>Strategic Recommendations</h2>
          <p>
            Based on the synthesized data, we recommend the following immediate strategic actions for
            enterprise leadership:
          </p>
          <ul>
            <li>
              <strong>Implement Redundant Sourcing for Critical Nodes:</strong> Identify single points
              of failure within the supply chain and immediately establish secondary suppliers in
              geographically distinct regions. Accept the margin compression (estimated at 2-4%) as an
              necessary insurance premium for operational continuity.
            </li>
            <li>
              <strong>Accelerate Digital Twin Deployment:</strong> Invest in real-time &quot;Digital Twin&quot;
              simulations of the entire supply network. This allows for proactive scenario testing
              against geopolitical shocks and climate events before they occur.
            </li>
            <li>
              <strong>Re-evaluate Inventory Holding Strategies:</strong> Transition from aggressive lean
              inventory models to strategically buffered reserves for high-value, long-lead-time
              components. The cost of holding inventory is now demonstrably lower than the cost of a
              stockout during a macro-disruption.
            </li>
          </ul>
          <hr className="border-t border-outline-variant my-12" />
          <div className="bg-surface-container-low p-6 rounded-DEFAULT border border-outline-variant/30 flex items-start gap-4">
            <span className="material-symbols-outlined text-secondary mt-1">info</span>
            <div>
              <h4 className="font-h3 text-[18px] text-primary mb-1">About this Analysis</h4>
              <p className="font-body-md text-[14px] text-on-surface-variant mb-0">
                This document was automatically generated by ConsultAI&apos;s proprietary synthesis engine.
                It does not constitute formal financial or operational advice. For expert validation,
                please book a consultation with our network of human specialists.
              </p>
            </div>
          </div>
        </article>
      </main>

      <SiteFooter variant="details" />
    </div>
  );
}
