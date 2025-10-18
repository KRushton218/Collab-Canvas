import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CanvasDeployer {
  async deployWinner(winnerBranch: string, env: 'dev' | 'prod' = 'prod'): Promise<void> {
    console.log(`🚀 Deploying winner: ${winnerBranch} → ${env}`);

    await execAsync('git checkout main');
    await execAsync(`git merge ${winnerBranch} --no-ff`);

    if (env === 'prod') {
      await execAsync('npm run firebase:deploy:prod');
    } else {
      await execAsync('npm run firebase:deploy:dev');
    }

    console.log('✅ Deployment complete!');
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployer = new CanvasDeployer();
  const winnerIndex = process.argv.indexOf('--winner');
  const envIndex = process.argv.indexOf('--env');

  const winnerBranch = winnerIndex > -1 ? process.argv[winnerIndex + 1] : '';
  const env = ((envIndex > -1 ? process.argv[envIndex + 1] : 'prod') as 'dev' | 'prod');

  if (!winnerBranch) {
    console.error('Please provide --winner <branchName>');
    process.exit(1);
  }

  deployer.deployWinner(winnerBranch, env).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
