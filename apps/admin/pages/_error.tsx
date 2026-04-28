// Minimal Pages Router error page.
// Actual 404 handling is done by app/not-found.tsx in the App Router.
function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <p style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      {statusCode ? `Ошибка ${statusCode}` : 'Произошла ошибка'}
    </p>
  );
}

ErrorPage.getInitialProps = ({
  res,
  err,
}: {
  res?: { statusCode: number };
  err?: { statusCode: number };
}) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default ErrorPage;
