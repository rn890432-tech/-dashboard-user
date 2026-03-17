import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>CyberChef AI - AI Cooking Platform</title>
        <meta name="description" content="Discover, cook, and share recipes with AI. Meal planning, nutrition analysis, and video generation." />
        <meta property="og:title" content="CyberChef AI" />
        <meta property="og:description" content="AI-powered kitchen companion for recipes, meal plans, and cooking videos." />
        <meta property="og:image" content="/demo-screenshot.png" />
        <meta property="og:url" content="https://cyberchef.ai" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "CyberChef AI",
            "url": "https://cyberchef.ai",
            "description": "AI-powered kitchen companion for recipes, meal plans, and cooking videos."
          })}
        </script>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
