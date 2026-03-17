import RecipeFeed from '../components/feed/RecipeFeed';
import TrendingPanel from '../components/feed/TrendingPanel';
import CreatorSpotlight from '../components/feed/CreatorSpotlight';

export default function Discover() {
  return (
    <div className="flex flex-col md:flex-row gap-6 p-6">
      <div className="flex-1">
        <RecipeFeed />
      </div>
      <div className="w-full md:w-96 space-y-4">
        <TrendingPanel />
        <CreatorSpotlight />
      </div>
    </div>
  );
}
