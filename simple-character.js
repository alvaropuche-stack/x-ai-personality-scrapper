#!/usr/bin/env node

import TwitterPipeline from './src/twitter/TwitterPipeline.js';

async function createCharacter(newCharacterName, sourceAccounts, tweetsPerAccount = 100) {
  console.log('🤖 Creating AI Character');
  console.log('═'.repeat(50));

  const options = {
    tweetsPerAccount,
    filterRetweets: true,
    sortBy: 'total'
  };

  console.log(`📝 New Character: @${newCharacterName}`);
  console.log(`📊 Source Accounts: ${sourceAccounts.join(', ')}`);
  console.log(`⚙️  Options: ${options.tweetsPerAccount} tweets/account`);

  try {
    const pipeline = new TwitterPipeline(newCharacterName);
    const mergeStats = await pipeline.createMergedCharacter(sourceAccounts, options);

    console.log('✨ Character creation completed successfully!');
    console.log(`📊 Total Tweets: ${mergeStats.totalTweets}`);
    console.log(`📁 Saved to: pipeline/${newCharacterName}/2025-10-27/`);

    return mergeStats;

  } catch (error) {
    console.error(`❌ Character creation failed: ${error.message}`);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node simple-character.js <new_character_name> <account1> <account2> [account3...] [tweets_per_account]');
    console.error('Example: node simple-character.js alvaro_strive 0x_Sero marc_louvion levelsio 100');
    process.exit(1);
  }

  const newCharacterName = args[0];
  const sourceAccounts = args.slice(1, -1);
  const tweetsPerAccount = args[args.length - 1] && !isNaN(args[args.length - 1])
    ? parseInt(args[args.length - 1])
    : 100;

  console.log('🚀 X-Scraper - Character Generator');
  console.log('═'.repeat(60));

  try {
    await createCharacter(newCharacterName, sourceAccounts, tweetsPerAccount);
    console.log('\n🎉 Character creation process completed!');
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);