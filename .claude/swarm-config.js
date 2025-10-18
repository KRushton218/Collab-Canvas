// Minimal Claude Swarm Config for CollabCanvas
export const canvasSwarmConfig = {
  maxAgents: 2,
  timeoutMs: 15 * 60 * 1000,
  agents: [
    {
      name: 'performance-first',
      approach: 'Optimize for smooth drawing performance',
      focus: ['Canvas optimization', 'Minimal re-renders', 'Gesture handling']
    },
    {
      name: 'feature-rich',
      approach: 'Rich collaborative features',
      focus: ['Real-time sync', 'User presence', 'Advanced tools']
    }
  ],
  evaluation: {
    criteria: ['performance', 'collaboration', 'code_quality'],
    passingScore: 70
  }
};
