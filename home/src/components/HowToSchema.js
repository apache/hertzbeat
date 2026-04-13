import React from 'react';
import Head from '@docusaurus/Head';

export default function HowToSchema({ name, description, steps, totalTime, estimatedCost }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "totalTime": totalTime || "PT5M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "USD",
      "value": estimatedCost || "0"
    },
    "tool": [
      {
        "@type": "HowToTool",
        "name": "Docker"
      }
    ],
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "url": step.url,
      "itemListElement": step.itemListElement
    }))
  };

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Head>
  );
}
