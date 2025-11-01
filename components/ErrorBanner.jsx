import { Card, CardContent } from './ui/Card';

const ErrorBanner = ({ error }) => {
  if (!error) return null;

  return (
    <Card variant="default" className="border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20 mb-8">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-6 h-6 bg-danger-100 dark:bg-danger-900/40 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-semibold text-danger-800 dark:text-danger-200 mb-2">
              Connection Error
            </h3>
            <div className="text-sm text-danger-700 dark:text-danger-300 space-y-1">
              <p>{error}</p>
              <p>
                Please try refreshing the page or check your network connection.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorBanner;
