import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

const Hero = () => {
  return (
    <section className="py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Real-time Pakistan Stock Exchange Data
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Track live market ticks, analyze key statistics, and explore all available symbols. 
                Stay ahead with real-time updates and comprehensive market insights.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                as="a"
                href="#symbols"
                className="inline-flex items-center gap-2"
              >
                Explore Symbols
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
              
              <Button 
                variant="outline"
                as="a"
                href="#market-stats"
              >
                View Market Stats
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Card variant="glass" className="w-full max-w-md">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Market Summary
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Live market data updated every second
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                        Live
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Status
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        PSX
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Exchange
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
