#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import TwitterPipeline from './src/twitter/TwitterPipeline.js';
import Logger from './src/twitter/Logger.js';
import chalk from 'chalk';

const BLUE = chalk.blue;
const GREEN = chalk.green;
const YELLOW = chalk.yellow;
const RED = chalk.red;
const CYAN = chalk.cyan;

// Handle cleanup gracefully
process.on('unhandledRejection', (error) => {
  Logger.error(`❌ Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  Logger.error(`❌ Uncaught exception: ${error.message}`);
  process.exit(1);
});

class AccountScraper {
  constructor() {
    this.results = [];
  }

  async scrapeAccount(username) {
    console.log(BLUE.bold(`\n🐦 Scraping @${username}`));
    console.log('═'.repeat(50));

    const startTime = Date.now();
    let pipeline = null;

    try {
      pipeline = new TwitterPipeline(username);

      console.log(CYAN('🔍 Validating environment...'));
      await pipeline.validateEnvironment();

      console.log(CYAN('🔌 Initializing scraper...'));
      const scraperInitialized = await pipeline.initializeScraper();

      if (!scraperInitialized) {
        console.log(YELLOW('⚠️  Main scraper failed, trying fallback...'));
        // Try fallback if main fails
        console.log(YELLOW('🔄 Using fallback scraping method...'));
      }

      console.log(CYAN('📥 Collecting tweets...'));
      const allTweets = await pipeline.collectTweets(pipeline.scraper);

      if (allTweets.length === 0) {
        console.log(YELLOW('⚠️  No tweets collected'));
        return {
          username,
          success: false,
          tweets: 0,
          error: 'No tweets collected'
        };
      }

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log(GREEN(`✅ Successfully collected ${allTweets.length} tweets in ${duration}s`));

      // Show sample stats
      const originalTweets = allTweets.filter(t => !t.isRetweet && !t.isReply).length;
      const retweets = allTweets.filter(t => t.isRetweet).length;
      const replies = allTweets.filter(t => t.isReply).length;

      console.log(CYAN(`📊 Stats: ${originalTweets} original, ${retweets} retweets, ${replies} replies`));

      return {
        username,
        success: true,
        tweets: allTweets.length,
        duration,
        stats: {
          original: originalTweets,
          retweets,
          replies
        }
      };

    } catch (error) {
      console.log(RED(`❌ Failed to scrape @${username}: ${error.message}`));

      // Provide helpful suggestions
      if (error.message.includes('Cloudflare') || error.message.includes('blocked')) {
        console.log(YELLOW('💡 Suggestions:'));
        console.log(YELLOW('   - Check your cookies configuration'));
        console.log(YELLOW('   - Try using the browser-based scraper'));
        console.log(YELLOW('   - Wait some time and try again'));
      } else if (error.message.includes('authentication')) {
        console.log(YELLOW('💡 Suggestions:'));
        console.log(YELLOW('   - Check your TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL'));
        console.log(YELLOW('   - Verify your cookies are up to date'));
      }

      return {
        username,
        success: false,
        tweets: 0,
        error: error.message
      };

    } finally {
      // Cleanup
      if (pipeline && pipeline.scraper) {
        try {
          await pipeline.scraper.logout();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  async scrapeMultipleAccounts(usernames) {
    console.log(BLUE.bold('🚀 X-Scraper - Multiple Account Scraping'));
    console.log(CYAN('═'.repeat(60)));

    const results = [];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      console.log(BLUE(`\n📍 Account ${i + 1}/${usernames.length}: @${username}`));

      const result = await this.scrapeAccount(username);
      results.push(result);

      // Add delay between accounts to avoid rate limiting
      if (i < usernames.length - 1) {
        console.log(YELLOW('\n⏳ Waiting 30 seconds before next account...'));
        await this.delay(30000);
      }
    }

    // Show summary
    this.showSummary(results);

    return results;
  }

  showSummary(results) {
    console.log(BLUE.bold('\n📊 Scraping Summary'));
    console.log('═'.repeat(50));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(GREEN(`✅ Successful: ${successful.length} accounts`));
    console.log(RED(`❌ Failed: ${failed.length} accounts`));

    if (successful.length > 0) {
      console.log(BLUE('\n✅ Successful Accounts:'));
      successful.forEach(result => {
        console.log(GREEN(`   @${result.username}: ${result.tweets} tweets (${result.duration}s)`));
      });
    }

    if (failed.length > 0) {
      console.log(RED('\n❌ Failed Accounts:'));
      failed.forEach(result => {
        console.log(RED(`   @${result.username}: ${result.error}`));
      });
    }

    const totalTweets = successful.reduce((sum, r) => sum + r.tweets, 0);
    console.log(CYAN(`\n📈 Total tweets collected: ${totalTweets.toLocaleString()}`));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(RED('❌ Please provide at least one username'));
    console.log(CYAN('Usage: node scrape-accounts.js username1 username2 username3'));
    console.log(CYAN('Example: node scrape-accounts.js 0x_Sero marc_louvion levelsio'));
    process.exit(1);
  }

  const scraper = new AccountScraper();

  if (args.length === 1) {
    await scraper.scrapeAccount(args[0]);
  } else {
    await scraper.scrapeMultipleAccounts(args);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(YELLOW('\n\n👋 Scraping interrupted by user'));
  process.exit(0);
});

main().catch(error => {
  console.error(RED(`\n❌ Fatal error: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});