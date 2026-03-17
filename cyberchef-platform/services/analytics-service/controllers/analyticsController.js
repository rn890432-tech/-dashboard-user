exports.recipeGrowth = async (req, res) => {
  // Placeholder: Return recipe count per month
  res.json({
    data: [
      { month: '2026-01', count: 120 },
      { month: '2026-02', count: 150 },
      { month: '2026-03', count: 180 }
    ]
  });
};

exports.engagement = async (req, res) => {
  // Placeholder: Return engagement metrics
  res.json({
    data: [
      { date: '2026-03-01', likes: 50, comments: 20 },
      { date: '2026-03-02', likes: 60, comments: 25 }
    ]
  });
};

exports.followers = async (req, res) => {
  // Placeholder: Return follower growth
  res.json({
    data: [
      { date: '2026-03-01', followers: 1000 },
      { date: '2026-03-02', followers: 1100 }
    ]
  });
};
