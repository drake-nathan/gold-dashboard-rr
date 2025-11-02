import { Header } from "@/components/header";

export const meta = () => [
  { title: "Terms of Service - Dashboard.Gold" },
  {
    content: "Terms of Service for Dashboard.Gold price comparison tool",
    name: "description",
  },
  { content: "index, follow", name: "robots" },
];

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>

        <div className="space-y-6 text-muted-foreground">
          <p className="text-sm">
            <strong>Last Updated:</strong> October 31, 2025
          </p>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Dashboard.Gold (&quot;the Service&quot;),
              you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, please do
              not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p>Dashboard.Gold is a free price comparison tool that displays:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Real-time prices for precious metals products from Costco</li>
              <li>Bid prices from Collect Pure for similar products</li>
              <li>Market prices for gold, silver, bitcoin, and S&P 500</li>
              <li>
                Profit/loss calculations based on user-provided cashback
                settings
              </li>
            </ul>
            <p className="mt-4">
              The Service is provided &quot;as is&quot; for informational
              purposes only.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              3. No Financial Advice
            </h2>
            <p className="font-semibold text-foreground">
              IMPORTANT DISCLAIMER:
            </p>
            <p className="mt-2">
              Dashboard.Gold is NOT a financial advisor. We do not provide:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Investment advice or recommendations</li>
              <li>Buy or sell recommendations for any products</li>
              <li>Guaranteed profit calculations or predictions</li>
              <li>Tax, legal, or financial planning advice</li>
            </ul>
            <p className="mt-4">
              The information provided is for comparison purposes only. You are
              solely responsible for your financial decisions. Consult with a
              qualified financial advisor before making any investment
              decisions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              4. Accuracy of Information
            </h2>

            <h3 className="mt-4 mb-2 text-xl font-medium text-foreground">
              4.1 Data Sources
            </h3>
            <p>Price data is obtained from third-party sources:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Costco prices: Unwrangle API</li>
              <li>Collect Pure bids: Collect Pure API</li>
              <li>Market prices: Gold API and Financial Modeling Prep</li>
            </ul>

            <h3 className="mt-4 mb-2 text-xl font-medium text-foreground">
              4.2 No Guarantees
            </h3>
            <p>While we strive for accuracy, we make NO guarantees that:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Prices are current or accurate</li>
              <li>
                Products are in stock when displayed as &quot;In Stock&quot;
              </li>
              <li>Calculations are error-free</li>
              <li>Third-party APIs will provide correct data</li>
              <li>Profit/loss calculations reflect real-world outcomes</li>
            </ul>
            <p className="mt-4 font-semibold text-foreground">
              ALWAYS verify prices directly with Costco and Collect Pure before
              making any purchase decisions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              5. User Responsibilities
            </h2>
            <p>When using the Service, you agree to:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Verify all information independently before acting on it</li>
              <li>Use the Service only for lawful purposes</li>
              <li>
                Not scrape, harvest, or collect data from the Service
                automatically
              </li>
              <li>
                Not attempt to reverse engineer or access restricted areas of
                the Service
              </li>
              <li>Not use the Service to spam, defraud, or harm others</li>
              <li>Not violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              6. Third-Party Links and Services
            </h2>
            <p>
              The Service contains links to third-party websites (Costco,
              Collect Pure, etc.). When you click these links:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>You leave our Service and enter their website</li>
              <li>
                You are subject to their terms of service and privacy policies
              </li>
              <li>
                We are not responsible for their content, products, or services
              </li>
              <li>We do not endorse or guarantee their products</li>
              <li>
                Any transactions you make are between you and the third party
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              7. Affiliate Disclosure
            </h2>
            <p>
              Dashboard.Gold may participate in affiliate programs in the
              future. If we do, we will clearly disclose any affiliate
              relationships. We will only recommend products or services we
              believe provide value, regardless of compensation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              8. Intellectual Property
            </h2>
            <p>
              All content on Dashboard.Gold, including text, code, design,
              logos, and graphics, is owned by Dashboard.Gold or its licensors
              and is protected by copyright and other intellectual property
              laws.
            </p>
            <p className="mt-2">You may NOT:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                Copy, modify, or redistribute our content without permission
              </li>
              <li>Use our branding or logos without permission</li>
              <li>Create derivative works based on our Service</li>
              <li>Use automated tools to scrape or collect data</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              9. Disclaimer of Warranties
            </h2>
            <p className="uppercase">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1 uppercase">
              <li>Warranties of merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Accuracy, reliability, or completeness of information</li>
              <li>Uninterrupted or error-free operation</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              10. Limitation of Liability
            </h2>
            <p className="uppercase">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DASHBOARD.GOLD SHALL NOT
              BE LIABLE FOR ANY:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1 uppercase">
              <li>
                Indirect, incidental, special, consequential, or punitive
                damages
              </li>
              <li>Loss of profits, revenue, data, or use</li>
              <li>
                Damages resulting from reliance on information provided by the
                service
              </li>
              <li>
                Damages resulting from errors, inaccuracies, or omissions in
                data
              </li>
              <li>
                Damages from third-party websites or services you access through
                our links
              </li>
            </ul>
            <p className="mt-4">
              In no event shall our total liability exceed $100 USD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              11. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Dashboard.Gold, its
              operators, and affiliates from any claims, damages, losses, or
              expenses (including legal fees) arising from:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Any financial decisions you make based on the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              12. Service Availability
            </h2>
            <p>We reserve the right to:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Change pricing structure or introduce fees</li>
              <li>Remove or modify features without notice</li>
              <li>Block access to users who violate these Terms</li>
            </ul>
            <p className="mt-2">
              We are not liable for any interruption or termination of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              13. Privacy
            </h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a className="text-primary hover:underline" href="/privacy">
                Privacy Policy
              </a>
              . By using the Service, you consent to our data practices as
              described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              14. Changes to Terms
            </h2>
            <p>
              We may update these Terms at any time. Changes will be posted on
              this page with an updated &quot;Last Updated&quot; date. Your
              continued use of the Service after changes constitutes acceptance
              of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              15. Governing Law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the
              laws of the United States, without regard to conflict of law
              principles.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              16. Severability
            </h2>
            <p>
              If any provision of these Terms is found to be invalid or
              unenforceable, the remaining provisions will remain in full force
              and effect.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              17. Contact Information
            </h2>
            <p>If you have questions about these Terms, please contact us:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                <strong>Website:</strong>{" "}
                <a
                  className="text-primary hover:underline"
                  href="https://gold-dashboard-rr-production.up.railway.app"
                >
                  Dashboard.Gold
                </a>
              </li>
              {/* Add email when available */}
              {/* <li><strong>Email:</strong> legal@golddashboard.com</li> */}
            </ul>
          </section>

          <section className="mt-12 border-t pt-6">
            <p className="text-sm">
              By using Dashboard.Gold, you acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Terms;
