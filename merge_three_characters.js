import TwitterPipeline from './src/twitter/TwitterPipeline.js';
import Logger from './src/twitter/Logger.js';
import chalk from 'chalk';

// Get arguments from process.argv
const [,, newCharacter, ...sourceAccounts] = process.argv;

async function main() {
  if (!newCharacter || sourceAccounts.length < 2) {
    Logger.error("Usage: node merge_three_characters.js <new_name> <account1> <account2> [account3...]");
    Logger.info("Example: node merge_three_characters.js Vinci_Strive marclouvion 0x_Sero TheAhmadOsman");
    process.exit(1);
  }

  try {
    const pipeline = new TwitterPipeline(newCharacter);

    // Get available tweet counts for each account
    const availableTweets = await Promise.all(sourceAccounts.map(async (account) => {
      try {
        const tweets = await pipeline.getTweetsForAccount(account);
        return tweets.length;
      } catch (error) {
        Logger.warn(`Could not get tweet count for @${account}: ${error.message}`);
        return 0;
      }
    }));

    // Show available tweets per account
    console.log('\n📊 Available Tweets:');
    sourceAccounts.forEach((account, i) => {
      console.log(chalk.cyan(`@${account}: ${availableTweets[i]} tweets`));
    });

    // Create merged character with default options
    const mergeOptions = {
      tweetsPerAccount: 5, // Use all available tweets from our example data
      filterRetweets: true,
      sortBy: 'total' // Total engagement
    };

    Logger.info(`Creating merged character with ${mergeOptions.tweetsPerAccount} tweets per account...`);

    // Create merged character with options
    const mergeStats = await pipeline.createMergedCharacter(sourceAccounts, mergeOptions);

    Logger.success('✨ Character merge completed successfully!');
    Logger.stats("📊 Merge Summary", {
      "New Character": `@${newCharacter}`,
      "Source Accounts": sourceAccounts.join(', '),
      "Total Tweets": mergeStats.totalTweets,
      "Tweets per Account": mergeOptions.tweetsPerAccount
    });

  } catch (error) {
    Logger.error(`Failed to create merged character: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();