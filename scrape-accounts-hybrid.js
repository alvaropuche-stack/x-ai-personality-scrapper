#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import TwitterPipeline from './src/twitter/TwitterPipeline.js';
import Logger from './src/twitter/Logger.js';
import chalk from 'chalk';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const BLUE = chalk.blue;
const GREEN = chalk.green;
const YELLOW = chalk.yellow;
const RED = chalk.red;
const CYAN = chalk.cyan;
const MAGENTA = chalk.magenta;

// Handle cleanup gracefully
process.on('unhandledRejection', (error) => {
  Logger.error(`❌ Unhandled promise rejection: ${error.message}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  Logger.error(`❌ Uncaught exception: ${error.message}`);
  process.exit(1);
});

class HybridAccountScraper {
  constructor() {
    this.results = [];
    this.useBrowserScraping = false;
  }

  async scrapeWithBrowserScraper(username) {
    console.log(MAGENTA('\n🌐 Switching to Browser-Based Scraping'));
    console.log(MAGENTA('═'.repeat(50)));

    return new Promise((resolve, reject) => {
      console.log(CYAN(`🚀 Launching browser scraper for @${username}...`));

      const browserProcess = spawn('node', ['local_browser_scraper.js', username, '500'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      browserProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text.trim());
      });

      browserProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text.trim());
      });

      browserProcess.on('close', async (code) => {
        if (code === 0) {
          console.log(GREEN('\n✅ Browser scraping completed successfully'));

          // Check if data was created
          const dataPath = `pipeline/${username}/${new Date().toISOString().split('T')[0]}/raw/tweets.json`;

          try {
            await fs.access(dataPath);
            const tweetsData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
            const tweetCount = tweetsData.length;

            resolve({
              username,
              success: true,
              tweets: tweetCount,
              method: 'browser',
              dataPath
            });

          } catch (error) {
            resolve({
              username,
              success: false,
              tweets: 0,
              method: 'browser',
              error: 'No data file created'
            });
          }

        } else {
          console.log(RED(`\n❌ Browser scraping failed with code ${code}`));

          // Check if data was saved despite the failure
          const dataPath = `pipeline/${username}/${new Date().toISOString().split('T')[0]}/raw/tweets.json`;
          let tweetCount = 0;
          let dataSaved = false;

          try {
            await fs.access(dataPath);
            const tweetsData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
            tweetCount = tweetsData.length;
            dataSaved = true;

            console.log(YELLOW(`⚠️  Process failed but saved ${tweetCount} tweets to: ${dataPath}`));

            resolve({
              username,
              success: true, // Consider success if data was saved
              tweets: tweetCount,
              method: 'browser',
              dataPath,
              warning: `Process failed with code ${code} but data was saved`
            });

          } catch (error) {
            console.log(RED(`❌ No data saved: ${error.message}`));
            resolve({
              username,
              success: false,
              tweets: 0,
              method: 'browser',
              error: `Process failed with code ${code} - No data saved`
            });
          }
        }
      });

      browserProcess.on('error', (error) => {
        console.log(RED(`\n❌ Failed to start browser scraper: ${error.message}`));
        resolve({
          username,
          success: false,
          tweets: 0,
          method: 'browser',
          error: error.message
        });
      });

      // Handle Ctrl+C during browser scraping
      process.on('SIGINT', () => {
        browserProcess.kill('SIGINT');
        console.log(YELLOW('\n👋 Browser scraping interrupted'));
        reject(new Error('Process interrupted by user'));
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        browserProcess.kill('SIGTERM');
        resolve({
          username,
          success: false,
          tweets: 0,
          method: 'browser',
          error: 'Timeout after 10 minutes'
        });
      }, 10 * 60 * 1000);
    });
  }

  async scrapeWithMainScraper(username) {
    console.log(BLUE.bold(`\n🐦 Scraping @${username} (API Method)`));
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
        throw new Error('Scraper initialization failed');
      }

      console.log(CYAN('📥 Collecting tweets...'));
      const allTweets = await pipeline.collectTweets(pipeline.scraper);

      if (allTweets.length === 0) {
        throw new Error('No tweets collected');
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
        method: 'api',
        stats: {
          original: originalTweets,
          retweets,
          replies
        }
      };

    } catch (error) {
      console.log(RED(`❌ API scraper failed: ${error.message}`));

      // Check if it's a Cloudflare/blocking error
      const isCloudflareError = error.message.includes('Cloudflare') ||
                               error.message.includes('blocked') ||
                               error.message.includes('Authentication failed') ||
                               error.message.includes('login') ||
                               error.message.includes('cookies') ||
                               error.message.includes('Scraper initialization failed') ||
                               error.message.includes('No tweets collected');

      if (isCloudflareError) {
        console.log(YELLOW('🔄 Cloudflare/Authentication detected! Switching to browser-based scraping...'));
        return { fallbackNeeded: true, reason: 'cloudflare' };
      }

      return {
        username,
        success: false,
        tweets: 0,
        method: 'api',
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

  async scrapeAccount(username) {
    console.log(BLUE.bold(`\n🎯 Processing Account: @${username}`));
    console.log('═'.repeat(60));

    // Try main scraper first
    const mainResult = await this.scrapeWithMainScraper(username);

    // If fallback is needed, use browser scraper
    if (mainResult.fallbackNeeded) {
      const browserResult = await this.scrapeWithBrowserScraper(username);
      return browserResult;
    }

    return mainResult;
  }

  async scrapeMultipleAccounts(usernames) {
    console.log(BLUE.bold('🚀 X-Scraper - Hybrid Scraping System'));
    console.log(CYAN('═'.repeat(70)));
    console.log(YELLOW('💡 Smart Fallback: API → Browser Scraping when Cloudflare detected'));

    const results = [];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      console.log(BLUE(`\n📍 Account ${i + 1}/${usernames.length}: @${username}`));

      const result = await this.scrapeAccount(username);
      results.push(result);

      // Add delay between accounts to avoid rate limiting
      if (i < usernames.length - 1) {
        const delayTime = result.method === 'browser' ? 60000 : 30000; // Longer delay after browser scraping
        console.log(YELLOW(`\n⏳ Waiting ${Math.round(delayTime/1000)}s before next account...`));
        await this.delay(delayTime);
      }
    }

    // Show summary
    this.showSummary(results);

    return results;
  }

  showSummary(results) {
    console.log(BLUE.bold('\n📊 Hybrid Scraping Summary'));
    console.log('═'.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const apiScraped = results.filter(r => r.method === 'api' && r.success);
    const browserScraped = results.filter(r => r.method === 'browser' && r.success);

    console.log(GREEN(`✅ Successful: ${successful.length} accounts`));
    console.log(CYAN(`📡 API Method: ${apiScraped.length} accounts`));
    console.log(MAGENTA(`🌐 Browser Method: ${browserScraped.length} accounts`));
    console.log(RED(`❌ Failed: ${failed.length} accounts`));

    if (successful.length > 0) {
      console.log(BLUE('\n✅ Successful Accounts:'));
      successful.forEach(result => {
        const methodIcon = result.method === 'api' ? '📡' : '🌐';
        const duration = result.duration ? ` (${result.duration}s)` : '';
        let statusIcon = GREEN('✅');
        let message = `${result.tweets} tweets${duration} [${result.method}]`;

        if (result.warning) {
          statusIcon = YELLOW('⚠️');
          message += ` - ${result.warning}`;
        }

        console.log(`${statusIcon}   ${methodIcon} @${result.username}: ${message}`);
      });
    }

    if (failed.length > 0) {
      console.log(RED('\n❌ Failed Accounts:'));
      failed.forEach(result => {
        console.log(RED(`   ❌ @${result.username}: ${result.error}`));
      });
    }

    const totalTweets = successful.reduce((sum, r) => sum + r.tweets, 0);
    console.log(CYAN(`\n📈 Total tweets collected: ${totalTweets.toLocaleString()}`));

    if (browserScraped.length > 0) {
      console.log(YELLOW('\n💡 Browser scraping used for:'));
      console.log(YELLOW(`   - Cloudflare protection bypass`));
      console.log(YELLOW(`   - Accounts with anti-bot detection`));
      console.log(YELLOW(`   - Higher success rate for protected accounts`));
    }
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
    console.log(CYAN('Usage: node scrape-accounts-hybrid.js username1 username2 username3'));
    console.log(CYAN('Example: node scrape-accounts-hybrid.js 0x_Sero marc_louvion levelsio'));
    console.log(YELLOW('\n💡 Hybrid Mode: Automatically switches to browser scraping when API fails'));
    process.exit(1);
  }

  const scraper = new HybridAccountScraper();

  if (args.length === 1) {
    await scraper.scrapeAccount(args[0]);
  } else {
    await scraper.scrapeMultipleAccounts(args);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(YELLOW('\n\n👋 Hybrid scraping interrupted by user'));
  process.exit(0);
});

main().catch(error => {
  console.error(RED(`\n❌ Fatal error: ${error.message}`));
  console.error(error.stack);
  process.exit(1);
});