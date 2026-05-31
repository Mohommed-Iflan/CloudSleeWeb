import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

export default function AnalyticsTracker() {
  const location = useLocation(); // 1. Grab the current URL path

  useEffect(() => {
    // 2. Trigger this function every time the path changes
    ReactGA.send({ 
      hitType: "pageview", 
      page: location.pathname + location.search 
    });
  }, [location]); // 3. The dependency array tells React to re-run this on every navigation

  return null;
}