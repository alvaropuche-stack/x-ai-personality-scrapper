#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import TwitterPipeline from './src/twitter/TwitterPipeline.js';
import Logger from './src/twitter/Logger.js';
import fs from 'fs/promises';
import path from 'path';

const CYAN = chalk.cyan;
const GREEN = chalk.green;
const YELLOW = chalk.yellow;
const RED = chalk.red;
const BLUE = chalk.blue;
const BOLD = chalk.bold;

class InteractiveCLI {
  constructor() {
    this.isRunning = true;
    this.spinner = null;
  }

  async start() {
    console.log(BLUE.bold('\n🚀 X-Scraper Interactive CLI'));
    console.log(CYAN('═'.repeat(50)));

    await this.showMainMenu();
  }

  async showMainMenu() {
    while (this.isRunning) {
      console.log('\n' + CYAN.bold('📋 Main Menu'));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📱 Scrape Twitter Accounts', value: 'scrape' },
            { name: '🤖 Generate AI Character', value: 'character' },
            { name: '🔀 Merge Multiple Characters', value: 'merge' },
            { name: '📊 View Available Data', value: 'view' },
            { name: '⚙️  Configuration', value: 'config' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      switch (action) {
        case 'scrape':
          await this.handleScraping();
          break;
        case 'character':
          await this.handleCharacterGeneration();
          break;
        case 'merge':
          await this.handleCharacterMerging();
          break;
        case 'view':
          await this.handleViewData();
          break;
        case 'config':
          await this.handleConfiguration();
          break;
        case 'exit':
          this.isRunning = false;
          console.log(GREEN('\n👋 Goodbye!'));
          break;
      }
    }
  }

  async handleScraping() {
    console.log(BLUE.bold('\n📱 Twitter Scraping'));
    console.log(CYAN('─'.repeat(30)));

    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Scraping mode:',
        choices: [
          { name: 'Single Account', value: 'single' },
          { name: 'Multiple Accounts', value: 'multiple' },
          { name: 'Back to Menu', value: 'back' }
        ]
      }
    ]);

    if (mode === 'back') return;

    if (mode === 'single') {
      await this.scrapeSingleAccount();
    } else {
      await this.scrapeMultipleAccounts();
    }
  }

  async scrapeSingleAccount() {
    const { username } = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Enter Twitter username (without @):',
        validate: (input) => input.trim() !== '' || 'Username is required'
      }
    ]);

    const options = await this.getScrapingOptions();
    if (!options) return;

    await this.performScraping([username], options);
  }

  async scrapeMultipleAccounts() {
    const { usernamesInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'usernamesInput',
        message: 'Enter usernames (comma-separated, without @):',
        validate: (input) => input.trim() !== '' || 'At least one username is required'
      }
    ]);

    const usernames = usernamesInput.split(',').map(u => u.trim()).filter(u => u);
    const options = await this.getScrapingOptions();
    if (!options) return;

    await this.performScraping(usernames, options);
  }

  async getScrapingOptions() {
    const { useDefaults, startDate, endDate, maxTweets } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useDefaults',
        message: 'Use default scraping options?',
        default: true
      },
      ...(false ? [] : [
        {
          type: 'input',
          name: 'startDate',
          message: 'Start date (YYYY-MM-DD, optional):',
          when: () => false
        },
        {
          type: 'input',
          name: 'endDate',
          message: 'End date (YYYY-MM-DD, optional):',
          when: () => false
        },
        {
          type: 'number',
          name: 'maxTweets',
          message: 'Maximum tweets per account:',
          default: 1000,
          when: () => false
        }
      ])
    ]);

    if (useDefaults) {
      return {
        maxTweets: 1000,
        startDate: null,
        endDate: null
      };
    }

    return { startDate, endDate, maxTweets };
  }

  async performScraping(usernames, options) {
    console.log(BLUE.bold(`\n🔄 Scraping ${usernames.length} account(s)...`));

    for (const username of usernames) {
      const spinner = ora(`Scraping @${username}...`).start();

      try {
        const pipeline = new TwitterPipeline(username);

        // Set max tweets from options
        if (options.maxTweets) {
          process.env.MAX_TWEETS = options.maxTweets.toString();
        }

        const tweets = await pipeline.getTweetsForAccount(username);

        spinner.succeed(GREEN(`✅ @${username}: ${tweets.length} tweets collected`));

        // Show quick stats
        const originalTweets = tweets.filter(t => !t.isRetweet && !t.isReply).length;
        const retweets = tweets.filter(t => t.isRetweet).length;
        const replies = tweets.filter(t => t.isReply).length;
        console.log(CYAN(`   📊 ${originalTweets} original, ${retweets} retweets, ${replies} replies`));

      } catch (error) {
        spinner.fail(RED(`❌ @${username}: ${error.message}`));
        console.log(YELLOW(`   💡 Try checking if the username exists or cookies are configured`));
      }
    }

    console.log(GREEN.bold('\n✨ Scraping completed!'));
  }

  async handleCharacterGeneration() {
    console.log(BLUE.bold('\n🤖 AI Character Generation'));
    console.log(CYAN('─'.repeat(30)));

    // Get available usernames with data
    const availableAccounts = await this.getAvailableAccounts();

    if (availableAccounts.length === 0) {
      console.log(YELLOW('⚠️  No scraped data found. Please scrape some Twitter accounts first.'));
      return;
    }

    const { username, date } = await inquirer.prompt([
      {
        type: 'list',
        name: 'username',
        message: 'Select account to generate character from:',
        choices: availableAccounts
      },
      {
        type: 'list',
        name: 'date',
        message: 'Select data collection date:',
        choices: (answers) => this.getAvailableDates(answers.username)
      }
    ]);

    const spinner = ora('Generating AI character...').start();

    try {
      // Run character generation
      const { execSync } = await import('child_process');
      const command = `node src/character/GenerateCharacter.js ${username} ${date}`;
      execSync(command, { stdio: 'pipe', cwd: process.cwd() });

      spinner.succeed(GREEN('✅ Character generated successfully!'));
      console.log(CYAN(`   📁 Character saved to: characters/${username}_character.json`));

    } catch (error) {
      spinner.fail(RED(`❌ Character generation failed: ${error.message}`));
    }
  }

  async handleCharacterMerging() {
    console.log(BLUE.bold('\n🔀 Character Merging'));
    console.log(CYAN('─'.repeat(30)));

    const availableAccounts = await this.getAvailableAccounts();

    if (availableAccounts.length < 2) {
      console.log(YELLOW('⚠️  Need at least 2 accounts with data to merge.'));
      return;
    }

    const { sourceAccounts, newCharacterName } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'sourceAccounts',
        message: 'Select accounts to merge:',
        choices: availableAccounts,
        validate: (answers) => answers.length >= 2 || 'Select at least 2 accounts'
      },
      {
        type: 'input',
        name: 'newCharacterName',
        message: 'Enter name for new merged character:',
        validate: (input) => input.trim() !== '' || 'Character name is required'
      }
    ]);

    const options = await inquirer.prompt([
      {
        type: 'number',
        name: 'tweetsPerAccount',
        message: 'How many top tweets per account?',
        default: 50
      },
      {
        type: 'confirm',
        name: 'excludeRetweets',
        message: 'Exclude retweets?',
        default: true
      },
      {
        type: 'list',
        name: 'rankingMethod',
        message: 'Rank tweets by:',
        choices: [
          'Total engagement (likes + retweets)',
          'Likes only',
          'Retweets only'
        ],
        default: 'Total engagement (likes + retweets)'
      }
    ]);

    const spinner = ora('Creating merged character...').start();

    try {
      const pipeline = new TwitterPipeline(newCharacterName);

      const mergeOptions = {
        tweetsPerAccount: options.tweetsPerAccount,
        filterRetweets: options.excludeRetweets,
        sortBy: options.rankingMethod.includes('Total') ? 'total' :
                options.rankingMethod.includes('Likes') ? 'likes' : 'retweets'
      };

      const mergeStats = await pipeline.createMergedCharacter(sourceAccounts, mergeOptions);

      spinner.succeed(GREEN('✅ Merged character created successfully!'));

      Logger.stats("📊 Merge Summary", {
        "New Character": `@${newCharacterName}`,
        "Source Accounts": sourceAccounts.join(', '),
        "Total Tweets": mergeStats.totalTweets,
        "Tweets per Account": options.tweetsPerAccount
      });

    } catch (error) {
      spinner.fail(RED(`❌ Merge failed: ${error.message}`));
    }
  }

  async handleViewData() {
    console.log(BLUE.bold('\n📊 Available Data'));
    console.log(CYAN('─'.repeat(30)));

    const availableAccounts = await this.getAvailableAccounts();

    if (availableAccounts.length === 0) {
      console.log(YELLOW('⚠️  No scraped data found.'));
      return;
    }

    console.log(BLUE('\n📁 Accounts with data:'));

    for (const account of availableAccounts) {
      const dates = await this.getAvailableDates(account);
      console.log(CYAN(`\n👤 @${account}`));

      for (const date of dates) {
        const statsPath = `pipeline/${account}/${date}/analytics/stats.json`;
        try {
          const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
          console.log(`   📅 ${date}: ${stats.totalTweets} tweets`);
        } catch {
          console.log(`   📅 ${date}: ${YELLOW('Data incomplete')}`);
        }
      }
    }
  }

  async handleConfiguration() {
    console.log(BLUE.bold('\n⚙️  Configuration'));
    console.log(CYAN('─'.repeat(30)));

    const { option } = await inquirer.prompt([
      {
        type: 'list',
        name: 'option',
        message: 'Configuration options:',
        choices: [
          { name: 'Check Environment Variables', value: 'env' },
          { name: 'Check Cookie Files', value: 'cookies' },
          { name: 'View Pipeline Status', value: 'status' },
          { name: 'Back to Menu', value: 'back' }
        ]
      }
    ]);

    if (option === 'back') return;

    switch (option) {
      case 'env':
        await this.checkEnvironment();
        break;
      case 'cookies':
        await this.checkCookies();
        break;
      case 'status':
        await this.checkPipelineStatus();
        break;
    }
  }

  async checkEnvironment() {
    console.log(BLUE('\n🔍 Environment Variables:'));

    const envVars = [
      'TWITTER_USERNAME',
      'TWITTER_PASSWORD',
      'TWITTER_EMAIL',
      'OPENAI_API_KEY',
      'TOGETHER_API_KEY',
      'MAX_TWEETS',
      'DEBUG'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        const masked = envVar.includes('KEY') || envVar.includes('PASSWORD')
          ? '***' + value.slice(-4)
          : value;
        console.log(GREEN(`   ✅ ${envVar}: ${masked}`));
      } else {
        console.log(YELLOW(`   ❌ ${envVar}: not set`));
      }
    }
  }

  async checkCookies() {
    console.log(BLUE('\n🍪 Cookie Files:'));

    try {
      const files = await fs.readdir('cookies');
      for (const file of files) {
        if (file.endsWith('_cookies.json')) {
          const stats = await fs.stat(`cookies/${file}`);
          const modified = new Date(stats.mtime).toLocaleDateString();
          console.log(GREEN(`   ✅ ${file} (modified: ${modified})`));
        }
      }
    } catch {
      console.log(YELLOW('   ❌ No cookies directory found'));
    }
  }

  async checkPipelineStatus() {
    console.log(BLUE('\n📊 Pipeline Status:'));

    try {
      const accounts = await fs.readdir('pipeline');
      console.log(GREEN(`   ✅ ${accounts.length} accounts with data`));

      let totalTweets = 0;
      for (const account of accounts) {
        try {
          const dates = await fs.readdir(`pipeline/${account}`);
          const latestDate = dates.sort().pop();

          const statsPath = `pipeline/${account}/${latestDate}/analytics/stats.json`;
          const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
          totalTweets += stats.totalTweets;
        } catch {
          // Skip incomplete data
        }
      }

      console.log(CYAN(`   📈 Total tweets collected: ${totalTweets.toLocaleString()}`));

    } catch {
      console.log(YELLOW('   ❌ No pipeline directory found'));
    }
  }

  async getAvailableAccounts() {
    try {
      const accounts = await fs.readdir('pipeline');
      return accounts.filter(account => {
        const accountPath = `pipeline/${account}`;
        return fs.stat(accountPath).then(stat => stat.isDirectory()).catch(() => false);
      });
    } catch {
      return [];
    }
  }

  async getAvailableDates(username) {
    try {
      const dates = await fs.readdir(`pipeline/${username}`);
      return dates.filter(date =>
        fs.stat(`pipeline/${username}/${date}`).then(stat => stat.isDirectory()).catch(() => false)
      ).sort().reverse(); // Most recent first
    } catch {
      return [];
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(YELLOW('\n\n👋 Shutting down gracefully...'));
  process.exit(0);
});

// Start the CLI
const cli = new InteractiveCLI();
cli.start().catch(error => {
  console.error(RED(`\n❌ CLI Error: ${error.message}`));
  process.exit(1);
});