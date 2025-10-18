import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ApproachResult {
  agentId: string;
  branch: string;
  performance: number;
  collaboration: number;
  codeQuality: number;
  totalScore: number;
  passed: boolean;
}

export class CanvasEvaluator {
  async evaluateApproaches(sessionId: string): Promise<ApproachResult[]> {
    console.log('📊 Evaluating canvas implementations...');

    const branches = await this.getBranches(sessionId);
    const results: ApproachResult[] = [];

    for (const branch of branches) {
      console.log(`Testing ${branch}...`);

      await execAsync(`git checkout ${branch}`);

      const result = await this.testApproach(branch);
      results.push(result);
    }

    results.sort((a, b) => b.totalScore - a.totalScore);

    const winner = results[0];
    console.log(`🏆 Winner: ${winner.branch} (Score: ${winner.totalScore})`);

    return results;
  }

  private async getBranches(sessionId: string): Promise<string[]> {
    const { stdout } = await execAsync(`git branch --list "${sessionId}-approach-*"`);
    return stdout
      .split('\n')
      .map(line => line.replace('*', '').trim())
      .filter(Boolean);
  }

  private async testApproach(branch: string): Promise<ApproachResult> {
    const performance = await this.testPerformance();
    const collaboration = await this.testCollaboration();
    const codeQuality = await this.testCodeQuality();

    const totalScore = Math.round((performance + collaboration + codeQuality) / 3);
    const passed = totalScore >= 70;

    return {
      agentId: branch.split('-')[2] || 'agent-unknown',
      branch,
      performance,
      collaboration,
      codeQuality,
      totalScore,
      passed
    };
  }

  private async testPerformance(): Promise<number> {
    try {
      await execAsync('npm run test:performance');
      return 85;
    } catch {
      return 40;
    }
  }

  private async testCollaboration(): Promise<number> {
    try {
      await execAsync('npm run test:realtime');
      return 90;
    } catch {
      return 30;
    }
  }

  private async testCodeQuality(): Promise<number> {
    try {
      await execAsync('npm run lint && npm run test');
      return 80;
    } catch {
      return 50;
    }
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const evaluator = new CanvasEvaluator();
  const sessionArgIndex = process.argv.indexOf('--session');
  const sessionId = sessionArgIndex > -1 ? process.argv[sessionArgIndex + 1] : '';

  if (!sessionId) {
    console.error('Please provide --session <sessionId>');
    process.exit(1);
  }

  evaluator.evaluateApproaches(sessionId).then(results => {
    console.log(JSON.stringify(results, null, 2));
  });
}
