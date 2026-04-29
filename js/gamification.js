// Debate topics
const TOPICS = [
  'Should artificial intelligence be regulated by governments?',
  'Is social media doing more harm than good to society?',
  'Should college education be free for everyone?',
  'Is remote work better than office work?',
  'Should voting be mandatory in democracies?',
  'Is space exploration worth the investment?',
  'Should animals be used for scientific research?',
  'Is nuclear energy the solution to climate change?',
  'Should there be limits on free speech online?',
  'Is universal basic income a viable economic policy?',
  'Should genetic engineering of humans be permitted?',
  'Is capitalism the best economic system?',
];

function processDebateResult(analysis, speechData) {
  const p = getProfile();
  const newDebates = p.debatesCompleted + 1;
  const newFallacies = p.totalFallaciesFound + (analysis.fallacies?.length || 0);
  const newCounters = p.totalCounters + 1;
  updateProfile({ debatesCompleted: newDebates, totalFallaciesFound: newFallacies, totalCounters: newCounters });
  return [];
}
