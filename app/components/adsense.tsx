/**
 * Google AdSense Integration
 *
 * Displays Google AdSense ads on the site to monetize traffic.
 * Uses Auto Ads for automatic optimization.
 */

export const AdSense = () => {
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID;

  // Don't render if AdSense is not configured
  if (!clientId) {
    return null;
  }

  return (
    <>
      {/* Google AdSense Auto Ads Script */}
      <script
        async
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      />
    </>
  );
};
