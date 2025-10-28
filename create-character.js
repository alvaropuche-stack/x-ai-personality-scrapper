#!/usr/bin/env node

import TwitterPipeline from './src/twitter/TwitterPipeline.js';
import Logger from './src/twitter/Logger.js';
import chalk from 'chalk';

const GREEN = chalk.green;
const CYAN = chalk.cyan;
const YELLOW = chalk.yellow;
const BLUE = chalk.bold.blue;

async function createCharacter(newCharacterName, sourceAccounts, options = {}) {
  console.log(BLUE('🤖 Creating AI Character'));
  console.log('═'.repeat(50));

  const defaultOptions = {
    tweetsPerAccount: 50,
    filterRetweets: true,
    sortBy: 'total',
    ...options
  };

  console.log(CYAN(`📝 New Character: @${newCharacterName}`));
  console.log(CYAN(`📊 Source Accounts: ${sourceAccounts.join(', ')}`));
  console.log(CYAN(`⚙️  Options: ${defaultOptions.tweetsPerAccount} tweets/account, filter retweets: ${defaultOptions.filterRetweets}`));

  try {
    const pipeline = new TwitterPipeline(newCharacterName);
    const mergeStats = await pipeline.createMergedCharacter(sourceAccounts, defaultOptions);

    Logger.success('✨ Character creation completed successfully!');
    Logger.stats("📊 Character Summary", {
      "New Character": `@${newCharacterName}`,
      "Source Accounts": sourceAccounts.join(', '),
      "Total Tweets": mergeStats.totalTweets,
      "Tweets per Account": defaultOptions.tweetsPerAccount
    });

    return mergeStats;

  } catch (error) {
    console.error(chalk.red(`❌ Character creation failed: ${error.message}`));
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  console.log('Debug: Raw args:', args);

  if (args.length < 2) {
    console.error(chalk.red('Usage: node create-character.js <new_character_name> <account1> <account2> [account3...]'));
    console.error(chalk.cyan('Example: node create-character.js alvaro_strive 0x_Sero marc_louvion levelsio'));
    console.error(chalk.yellow('Optional args: --tweets 100 --filter-retweets false --sort likes'));
    process.exit(1);
  }

  const newCharacterName = args[0];
  const sourceAccounts = args.slice(1).filter(arg => !arg.startsWith('--'));

  // Parse options
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tweets' && args[i + 1]) {
      options.tweetsPerAccount = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--filter-retweets' && args[i + 1]) {
      options.filterRetweets = args[i + 1] !== 'false';
      i++;
    } else if (args[i] === '--sort' && args[i + 1]) {
      const sortValue = args[i + 1].toLowerCase();
      options.sortBy = sortValue.includes('total') ? 'total' :
                      sortValue.includes('likes') ? 'likes' : 'retweets';
      i++;
    }
  }

  console.log(BLUE('🚀 X-Scraper - Character Generator'));
  console.log(CYAN('═'.repeat(60)));

  try {
    await createCharacter(newCharacterName, sourceAccounts, options);
    console.log(GREEN.bold('\n🎉 Character creation process completed!'));
  } catch (error) {
    console.error(chalk.red('\n❌ Process failed:'), error.message);
    process.exit(1);
  }
}

main().catch(console.error);