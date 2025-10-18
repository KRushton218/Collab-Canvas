import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CanvasTask {
  feature: string;
  description?: string;
  approaches: string[];
}

export class CanvasSwarmLauncher {
  async launchFeature(task: CanvasTask): Promise<void> {
    console.log(`🎨 Launching canvas swarm for: ${task.feature}`);

    const sessionId = `canvas-${Date.now()}`;

    const branchPromises = task.approaches.map(async (approach, index) => {
      const branchName = `${sessionId}-approach-${index + 1}`;

      await execAsync(`git checkout -b ${branchName}`);

      return this.spawnSimpleAgent({
        sessionId,
        agentId: `agent-${index + 1}`,
        branch: branchName,
        approach,
        feature: task.feature
      });
    });

    await Promise.all(branchPromises);
    console.log('🚀 Both agents are working...');
  }

  private async spawnSimpleAgent(config: any): Promise<void> {
    const agentScript = `
      echo "🤖 Agent ${config.agentId} starting..." && \
      echo "📝 Feature: ${config.feature}" && \
      echo "🎯 Approach: ${config.approach}" && \
      npx --yes claude-flow@alpha agent work \
        --task "${config.feature}" \
        --approach "${config.approach}" \
        --output ./implementations/${config.agentId}
    `;

    exec(agentScript, (error, stdout, stderr) => {
      if (error) {
        console.error(`Agent ${config.agentId} error:`, error);
        if (stderr) console.error(stderr);
        return;
        }
      if (stdout) console.log(`Agent ${config.agentId} output:`, stdout);
    });
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const launcher = new CanvasSwarmLauncher();
  const featureArgIndex = process.argv.indexOf('--feature');
  const approachesArgIndex = process.argv.indexOf('--approaches');

  const feature = featureArgIndex > -1 ? process.argv[featureArgIndex + 1] : 'Real-time collaborative drawing';
  const approaches = (approachesArgIndex > -1 ? process.argv[approachesArgIndex + 1] : 'performance-optimized,feature-rich')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  launcher.launchFeature({ feature, approaches });
}
