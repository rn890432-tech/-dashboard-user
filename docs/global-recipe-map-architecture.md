# Global Recipe Discovery Map Architecture (Mermaid)

%% Paste this into Mermaid live editor or markdown viewer

graph TD
  A[User] --> B[ExploreMap UI]
  B --> C[Map Visualization Library (react-simple-maps/leaflet)]
  C --> D[API: /explore/trending-by-region]
  C --> E[API: /explore/top-creators]
  B --> F[Analytics Tracker]
  F --> G[API: /analytics/map-event]
  C --> H[Heatmap Layer]
  D --> I[Trending Recipes Dataset]
  E --> J[Creator Profiles]
  B --> K[Recipe Preview Panel]
  K --> J
  K --> I
