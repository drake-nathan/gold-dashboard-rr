import { Header } from "@/components/header";

export const meta = () => [
  { title: "Privacy Policy - Dashboard.Gold" },
  {
    content: "Privacy Policy for Dashboard.Gold price comparison tool",
    name: "description",
  },
  { content: "index, follow", name: "robots" },
];

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

        <div className="space-y-6 text-muted-foreground">
          <p className="text-sm">
            <strong>Last Updated:</strong> October 31, 2025
          </p>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              Dashboard.Gold (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates this
              website to provide real-time price comparisons for precious metals products. This
              Privacy Policy explains how we collect, use, and protect your information when you use
              our service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              2. Information We Collect
            </h2>

            <h3 className="mt-4 mb-2 text-xl font-medium text-foreground">
              2.1 Information You Provide
            </h3>
            <p>
              Currently, Dashboard.Gold does not require user accounts or personal information. We
              do not collect names, email addresses, or other personally identifiable information
              unless you choose to contact us directly.
            </p>

            <h3 className="mt-4 mb-2 text-xl font-medium text-foreground">
              2.2 Automatically Collected Information
            </h3>
            <p>When you visit our website, we automatically collect:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                <strong>Usage Data:</strong> Pages viewed, time spent on pages, click data, and
                navigation patterns
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, device type,
                and screen resolution
              </li>
              <li>
                <strong>Location Data:</strong> General geographic location based on IP address
                (country/region level only)
              </li>
              <li>
                <strong>Cookies and Local Storage:</strong> Preferences such as theme selection
                (dark/light mode) and calculator settings
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              3. How We Use Your Information
            </h2>
            <p>We use collected information to:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Improve and optimize our website performance</li>
              <li>Understand how users interact with our price comparison tool</li>
              <li>Analyze which features are most valuable to users</li>
              <li>Remember your preferences (theme, calculator settings)</li>
              <li>Detect and prevent technical issues or abuse</li>
              <li>Measure the effectiveness of our marketing campaigns (if applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              4. Analytics and Tracking
            </h2>

            <h3 className="mt-4 mb-2 text-xl font-medium text-foreground">4.1 PostHog</h3>
            <p>We use PostHog for analytics and error tracking. PostHog collects:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Page views and user interactions</li>
              <li>Technical errors and exceptions</li>
              <li>Session recordings (anonymized)</li>
              <li>Feature usage statistics</li>
            </ul>
            <p className="mt-2">
              PostHog data is stored securely and used only for improving our service. Learn more:{" "}
              <a
                className="text-primary hover:underline"
                href="https://posthog.com/privacy"
                rel="noopener noreferrer"
                target="_blank"
              >
                PostHog Privacy Policy
              </a>
            </p>

            <h3 className="mt-4 mb-2 text-xl font-medium text-foreground">4.2 Google AdSense</h3>
            <p>We use Google AdSense to display ads on our site. Google AdSense:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>Uses cookies to serve ads based on your browsing history</li>
              <li>May collect non-personally identifiable information</li>
              <li>Allows you to opt out via Google&apos;s Ads Settings</li>
              <li>Is governed by Google&apos;s privacy policy</li>
            </ul>
            <p className="mt-2">
              Learn more:{" "}
              <a
                className="text-primary hover:underline"
                href="https://policies.google.com/technologies/ads"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Ads Privacy Policy
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              5. Cookies and Similar Technologies
            </h2>
            <p>We use cookies and browser local storage to enhance your experience:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                <strong>Essential Cookies:</strong> Required for the site to function (e.g., session
                management)
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your theme and calculator settings
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand usage patterns
              </li>
              <li>
                <strong>Advertising Cookies:</strong> Track ad campaign performance (Google Ads)
              </li>
            </ul>
            <p className="mt-2">
              You can disable cookies in your browser settings, but some features may not work
              properly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              6. Third-Party Services and Links
            </h2>
            <p>
              Our website contains links to third-party websites (Costco, Collect Pure). When you
              click these links:
            </p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>You leave our website and are subject to their privacy policies</li>
              <li>We do not control or take responsibility for their privacy practices</li>
              <li>
                We recommend reviewing their privacy policies before providing any information
              </li>
            </ul>

            <p className="mt-4">Third-party services we use:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                <strong>Convex:</strong> Database and backend services
              </li>
              <li>
                <strong>PostHog:</strong> Analytics and error tracking
              </li>
              <li>
                <strong>Google AdSense:</strong> Display advertising
              </li>
              <li>
                <strong>Railway:</strong> Hosting infrastructure
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">7. Data Security</h2>
            <p>We implement reasonable security measures to protect your information:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>HTTPS encryption for all data transmission</li>
              <li>Secure cloud infrastructure (Railway, Convex)</li>
              <li>Regular security updates and monitoring</li>
              <li>Limited data retention (analytics data kept for 90 days)</li>
            </ul>
            <p className="mt-2">
              However, no method of transmission over the internet is 100% secure. We cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect
              information from children. If you believe we have collected information from a child,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">9. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                <strong>Access:</strong> Request what information we have about you
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your information
              </li>
              <li>
                <strong>Opt-Out:</strong> Disable analytics cookies or tracking
              </li>
              <li>
                <strong>Portability:</strong> Request your data in a portable format
              </li>
            </ul>
            <p className="mt-2">
              To exercise these rights, please clear your browser cookies and local storage, or
              contact us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this
              page with an updated &quot;Last Updated&quot; date. We encourage you to review this
              policy periodically.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact
              us:
            </p>
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
              {/* <li><strong>Email:</strong> privacy@golddashboard.com</li> */}
            </ul>
          </section>

          <section className="mt-12 border-t pt-6">
            <p className="text-sm">
              This privacy policy was last updated on October 31, 2025. By using Dashboard.Gold, you
              agree to this Privacy Policy.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
