// Custom error page to avoid styled-jsx conflict with React 19
function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div>
      {statusCode ? `${statusCode} error occurred` : 'Client error occurred'}
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
