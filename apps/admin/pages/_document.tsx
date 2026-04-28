import { Html, Head, Main, NextScript } from 'next/document';

// Custom _document for Pages Router compatibility (used when Next.js generates /_error pages).
// The App Router (src/app/) handles all production routes.
export default function Document() {
  return (
    <Html lang="ru">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
