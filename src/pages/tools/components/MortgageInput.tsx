import { useEffect, useState } from "react";
import { TTL, useLocalStorage } from "../../../hooks/use-local-storage";

interface MortgageInputProps {
  loanTerm: number;
  currentRate: number;
  onRateChange: (rate: number) => void;
}

interface FredApiResponse {
  series: string;
  rate: number;
  date: string;
  timestamp: string;
  fallback?: boolean;
}
export default function MortgageInput({
  loanTerm,
  currentRate,
  onRateChange,
}: MortgageInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedTerm, setLastFetchedTerm] = useState<number | null>(null);

  const [, , , isInterestRateValid] = useLocalStorage(
    "rental-analysis-interest-rate",
    currentRate,
    TTL.ONE_DAY
  );

  const [cachedRates, setCachedRates] = useLocalStorage(
    "fred-rate-cache",
    {} as Record<string, FredApiResponse>,
    TTL.ONE_DAY
  );

  const getProxyUrl = () => {
    if (process.env.NODE_ENV == "development") {
      return "http://localhost:3000";
    }
    return "https://rb-dev-hj7yghy6b-reece-bernards-projects.vercel.app";
  };

  const getCachedRate = (series: string): FredApiResponse | null => {
    const cached = cachedRates[series];
    if (!cached) return null;

    const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return cacheAge < oneDayMs ? cached : null;
  };

  // Determine which FRED series to use based on loan term
  const getFredSeries = (term: number): "MORTGAGE15US" | "MORTGAGE30US" => {
    return term <= 20 ? "MORTGAGE15US" : "MORTGAGE30US";
  };

  const fetchCurrentRate = async (term: number) => {
    const series = getFredSeries(term);
    const proxyUrl = getProxyUrl();

    // Skip if no proxy URL configured
    if (!proxyUrl) {
      console.log("No proxy URL configured, using fallback rates");
      const fallbackRates = {
        MORTGAGE15US: 6.8,
        MORTGAGE30US: 7.2,
      };
      onRateChange(fallbackRates[series] || 7.0);
      setLastFetchedTerm(term);
      return;
    }

    // Check cache first
    const cachedRate = getCachedRate(series);
    if (cachedRate) {
      console.log(`Using cached ${series} rate: ${cachedRate.rate}%`);
      onRateChange(Number(cachedRate.rate.toFixed(2)));
      setLastFetchedTerm(term);
      return;
    }

    setIsLoading(true);

    try {
      const url = `${proxyUrl}/api/fred-proxy?series=${series}`;

      const response = await fetch(url);

      if (response.ok) {
        const data: FredApiResponse = await response.json();

        if (data.rate && !isNaN(data.rate)) {
          // Update rate
          onRateChange(Number(data.rate.toFixed(2)));
          setLastFetchedTerm(term);

          // Cache the response
          setCachedRates((prev) => ({
            ...prev,
            [series]: data,
          }));

          const source = data.fallback ? "fallback" : "FRED";
          console.log(`Updated ${series} rate: ${data.rate}% (${source})`);
        }
      } else {
        throw new Error(`Proxy error: ${response.status}`);
      }
    } catch (err) {
      console.log("Unable to fetch from proxy, using fallback");

      // Use fallback rates
      const fallbackRates = {
        MORTGAGE15US: 6.8,
        MORTGAGE30US: 7.2,
      };

      const fallbackRate = fallbackRates[series] || 7.0;
      onRateChange(fallbackRate);
      setLastFetchedTerm(term);

      // Cache the fallback response
      const fallbackResponse: FredApiResponse = {
        series,
        rate: fallbackRate,
        date: new Date().toISOString().split("T")[0],
        timestamp: new Date().toISOString(),
        fallback: true,
      };

      setCachedRates((prev) => ({
        ...prev,
        [series]: fallbackResponse,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log(loanTerm);
    const shouldFetch = !isInterestRateValid() || lastFetchedTerm !== loanTerm;
    console.log(shouldFetch);

    if (shouldFetch) {
      fetchCurrentRate(loanTerm);
    }
  }, [loanTerm, isInterestRateValid()]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Interest Rate: {currentRate.toFixed(2)}%
      </label>

      <input
        type="range"
        min="0"
        max="20"
        step="0.01"
        value={currentRate}
        onChange={(e) => onRateChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        disabled={isLoading}
      />

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0%</span>
        <span>20%</span>
      </div>

      <div className="text-xs text-gray-500 mt-2">
        Rate automatically updated from national averages. Local rates may vary.
      </div>
    </div>
  );
}
