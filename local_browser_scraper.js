import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

// Handle __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure stealth
puppeteer.use(StealthPlugin());

class LocalBrowserScraper {
    constructor(username, maxTweets = 500) {
        this.username = username;
        this.tweets = [];
        this.maxTweets = maxTweets; // Límite configurable
        this.browser = null;
        this.page = null;
    }

    normalizeCookies(cookies) {
        return cookies
            .filter(cookie => {
                // Skip cookies with null/undefined sameSite values that cause issues
                if (cookie.sameSite === null || cookie.sameSite === undefined) {
                    console.log(chalk.gray(`   Skipping cookie ${cookie.name} (sameSite is null/undefined)`));
                    return false;
                }
                // Skip cookies without essential fields
                if (!cookie.name || !cookie.value || !cookie.domain) {
                    console.log(chalk.gray(`   Skipping cookie ${cookie.name} (missing essential fields)`));
                    return false;
                }
                return true;
            })
            .map(cookie => {
                const normalizedCookie = { ...cookie };

                // Normalize sameSite values to Puppeteer-compatible format
                if (normalizedCookie.sameSite) {
                    const sameSiteLower = normalizedCookie.sameSite.toLowerCase();
                    switch (sameSiteLower) {
                        case 'no_restriction':
                            normalizedCookie.sameSite = 'None';
                            break;
                        case 'lax':
                            normalizedCookie.sameSite = 'Lax';
                            break;
                        case 'strict':
                            normalizedCookie.sameSite = 'Strict';
                            break;
                        default:
                            normalizedCookie.sameSite = 'Lax'; // Default fallback
                    }
                }

                // Remove fields that Puppeteer doesn't accept
                delete normalizedCookie.hostOnly;
                delete normalizedCookie.session;
                delete normalizedCookie.storeId;

                return normalizedCookie;
            });
    }

    async connectToBrowser() {
        const spinner = ora('Connecting to your browser...').start();

        try {
            // Try to connect to existing Chrome instance with debugging
            // You'll need to start Chrome with: chrome --remote-debugging-port=9222
            this.browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null
            });

            spinner.succeed('Connected to browser successfully!');
            return true;
        } catch (error) {
            spinner.fail('Could not connect to browser');
            console.log(chalk.yellow('\n📋 To connect to your browser:'));
            console.log(chalk.white('1. Open Chrome/Brave'));
            console.log(chalk.white('2. Go to: chrome://inspect'));
            console.log(chalk.white('3. Click "Open dedicated DevTools for Node"'));
            console.log(chalk.white('4. OR start Chrome with: chrome --remote-debugging-port=9222'));
            console.log(chalk.cyan('\n⚡ Alternative: Launching new browser instance...'));

            // Launch new browser with dedicated profile
            const profilePath = path.join(__dirname, 'chrome-profile');
            this.browser = await puppeteer.launch({
                headless: false, // Show browser so you can log in manually
                defaultViewport: null,
                userDataDir: profilePath, // Use dedicated profile
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--enable-features=NetworkService,NetworkServiceInProcess2',
                    '--force-color-profile=srgb',
                    '--metrics-recording-only',
                    '--no-first-run',
                    '--password-store=basic',
                    '--use-mock-keychain',
                    '--disable-default-apps',
                    '--disable-extensions-except',
                    '--disable-sync',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-background-networking',
                    '--disable-default-apps',
                    '--no-default-browser-check',
                    '--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls',
                    '--disable-breakpad',
                    '--disable-crash-reporter',
                    '--disable-metrics-reporting',
                    '--disable-hang-monitor'
                ]
            });

            spinner.succeed('Browser launched with dedicated profile!');
            console.log(chalk.blue('\nProfile created at: chrome-profile/'));
            console.log(chalk.gray('This looks like a regular Chrome profile, not automation.'));
            return true;
        }
    }

    async setupPage() {
        const pages = await this.browser.pages();
        if (pages.length > 0) {
            this.page = pages[0];
        } else {
            this.page = await this.browser.newPage();
        }

        // Set up stealth mode
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = { runtime: {} };
        });

        // Set realistic user agent
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Load cookies from file
        let cookies = [];
        try {
            const cookiesPath = path.join(__dirname, 'x-cookies.json');
            const cookiesData = await fs.readFile(cookiesPath, 'utf-8');
            cookies = JSON.parse(cookiesData);
            console.log(chalk.green(`Loaded ${cookies.length} cookies from x-cookies.json`));

            // Normalize cookies for Puppeteer compatibility
            cookies = this.normalizeCookies(cookies);
            console.log(chalk.green(`Normalized ${cookies.length} cookies for browser compatibility`));
        } catch (error) {
            console.log(chalk.yellow('No x-cookies.json file found. Using example cookies...'));
            console.log(chalk.cyan('Create x-cookies.json with your Twitter cookies for full access.'));

            // Fallback to example cookies (limited functionality)
            cookies = [];
        }

        try {
            await this.page.setCookie(...cookies);
            console.log(chalk.green('Cookies loaded - authenticated session active'));
        } catch (cookieError) {
            console.log(chalk.red(`❌ Failed to set cookies: ${cookieError.message}`));
            console.log(chalk.yellow('🔄 Attempting to continue without cookies...'));
        }
    }

    async navigateToTwitterProfile() {
        const spinner = ora(`Navigating to @${this.username} profile...`).start();

        try {
            // Add random delay before navigating
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

            await this.page.goto(`https://twitter.com/${this.username}`, {
                waitUntil: 'networkidle2',
                timeout: 45000
            });

            // Wait for profile to load with human-like delay
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
            await this.page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 15000 });

            // Simulate human reading time
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

            spinner.succeed(`Loaded @${this.username} profile`);
            return true;
        } catch (error) {
            spinner.fail('Failed to load profile');
            console.error(chalk.red('Error:'), error.message);
            return false;
        }
    }

    async checkIfLoggedIn() {
        console.log(chalk.green('\nAuthenticated session active - proceeding with extraction...'));
        return true; // Cookies provide authentication
    }

    async extractTweets() {
        const spinner = ora('Extracting tweets...').start();
        this.tweets = [];

        // Initial human-like pause before starting extraction
        console.log(chalk.yellow('Taking a moment to browse naturally...'));
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));

        try {
            let previousHeight = 0;
            let noNewTweetsCount = 0;
            const maxNoNewTweets = 5; // Increased patience

            while (this.tweets.length < this.maxTweets && noNewTweetsCount < maxNoNewTweets) {
                // Extract tweets from current page
                const newTweets = await this.page.evaluate(() => {
                    const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
                    const tweets = [];

                    tweetElements.forEach(element => {
                        try {
                            const textElement = element.querySelector('[data-testid="tweetText"]');
                            const timeElement = element.querySelector('time');
                            const nameElement = element.querySelector('[data-testid="User-Name"]');
                            const usernameElement = element.querySelector('[data-testid="User-Names"] span');
                            const likeElement = element.querySelector('[data-testid="like"]');
                            const retweetElement = element.querySelector('[data-testid="retweet"]');
                            const replyElement = element.querySelector('[data-testid="reply"]');

                            if (textElement && timeElement) {
                                const text = textElement.innerText.trim();
                                const time = timeElement.getAttribute('datetime');
                                const name = nameElement ? nameElement.innerText : '';
                                const username = usernameElement ? usernameElement.innerText : '';
                                const likes = likeElement ? parseInt(likeElement.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0') : 0;
                                const retweets = retweetElement ? parseInt(retweetElement.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0') : 0;
                                const replies = replyElement ? parseInt(replyElement.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0') : 0;

                                // Extract URLs
                                const linkElements = element.querySelectorAll('a[role="link"]');
                                const urls = Array.from(linkElements)
                                    .map(link => link.href)
                                    .filter(href => href.includes('twitter.com') === false);

                                // Extract hashtags
                                const hashtagElements = element.querySelectorAll('a[href*="hashtag"]');
                                const hashtags = Array.from(hashtagElements)
                                    .map(tag => tag.innerText.replace('#', ''));

                                // Generate unique ID
                                const id = Math.random().toString(36).substr(2, 9);

                                tweets.push({
                                    id,
                                    text,
                                    username: username.replace('@', ''),
                                    name,
                                    timestamp: new Date(time).getTime(),
                                    createdAt: time,
                                    likes,
                                    retweetCount: retweets,
                                    replies,
                                    urls,
                                    hashtags,
                                    isReply: text.includes('@'),
                                    isRetweet: text.includes('RT @'),
                                    permanentUrl: `https://twitter.com/${username.replace('@', '')}/status/${id}`
                                });
                            }
                        } catch (error) {
                            console.error('Error extracting tweet:', error);
                        }
                    });

                    return tweets;
                });

                // Add new tweets (avoid duplicates)
                const existingIds = new Set(this.tweets.map(t => t.id));
                const uniqueNewTweets = newTweets.filter(tweet => !existingIds.has(tweet.id));
                this.tweets.push(...uniqueNewTweets);

                spinner.text = `Extracted ${this.tweets.length} tweets...`;

                // Human-like reading break between scroll cycles
                console.log(chalk.blue(`Reading ${uniqueNewTweets.length} new tweets...`));
                await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));

                // Scroll down to load more tweets - human-like scrolling
                const currentHeight = await this.page.evaluate('document.body.scrollHeight');

                // Scroll in small increments like a human
                await this.page.evaluate(() => {
                    window.scrollBy(0, 300);
                });
                await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

                await this.page.evaluate(() => {
                    window.scrollBy(0, 400);
                });
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

                await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');

                // Wait for new content to load - longer random delay
                await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));

                // Check if we've loaded new content
                const newHeight = await this.page.evaluate('document.body.scrollHeight');
                if (newHeight === previousHeight) {
                    noNewTweetsCount++;
                } else {
                    noNewTweetsCount = 0;
                    previousHeight = newHeight;
                }

                // Safety check to avoid infinite loops
                if (this.tweets.length >= this.maxTweets) {
                    break;
                }
            }

            spinner.succeed(`Extracted ${this.tweets.length} tweets from @${this.username}`);
            return this.tweets;
        } catch (error) {
            spinner.fail('Failed to extract tweets');
            console.error(chalk.red('Error:'), error.message);
            return [];
        }
    }

    async saveTweets() {
        const date = new Date().toISOString().split('T')[0];
        const baseDir = path.join('pipeline', this.username, date);

        // Create directories
        await fs.mkdir(path.join(baseDir, 'raw'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'processed'), { recursive: true });
        await fs.mkdir(path.join(baseDir, 'analytics'), { recursive: true });

        // Save raw tweets
        const rawPath = path.join(baseDir, 'raw', 'tweets.json');
        await fs.writeFile(rawPath, JSON.stringify(this.tweets, null, 2));

        // Save processed data for fine-tuning
        const processedPath = path.join(baseDir, 'processed', 'finetuning.jsonl');
        const finetuningData = this.tweets
            .filter(tweet => !tweet.isRetweet && tweet.text.length > 20)
            .map(tweet => ({ text: tweet.text }));

        const finetuningContent = finetuningData.map(entry => JSON.stringify(entry)).join('\n');
        await fs.writeFile(processedPath, finetuningContent);

        // Generate and save stats
        const stats = this.generateStats();
        const statsPath = path.join(baseDir, 'analytics', 'stats.json');
        await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

        console.log(chalk.green(`\n✅ Data saved to: ${baseDir}`));
        return { baseDir, stats };
    }

    generateStats() {
        const directTweets = this.tweets.filter(t => !t.isReply && !t.isRetweet);
        const totalLikes = this.tweets.reduce((sum, t) => sum + (t.likes || 0), 0);
        const totalRetweets = this.tweets.reduce((sum, t) => sum + (t.retweetCount || 0), 0);
        const totalReplies = this.tweets.reduce((sum, t) => sum + (t.replies || 0), 0);

        return {
            totalTweets: this.tweets.length,
            directTweets: directTweets.length,
            replies: this.tweets.filter(t => t.isReply).length,
            retweets: this.tweets.filter(t => t.isRetweet).length,
            engagement: {
                totalLikes,
                totalRetweetCount: totalRetweets,
                totalReplies,
                averageLikes: (totalLikes / this.tweets.length).toFixed(2),
                topTweets: this.tweets
                    .sort((a, b) => (b.likes + b.retweetCount) - (a.likes + a.retweetCount))
                    .slice(0, 5)
                    .map(t => ({
                        id: t.id,
                        text: t.text.slice(0, 100),
                        likes: t.likes,
                        retweetCount: t.retweetCount,
                        url: t.permanentUrl
                    }))
            },
            timeRange: {
                start: new Date(Math.min(...this.tweets.map(t => new Date(t.timestamp)))).toISOString().split('T')[0],
                end: new Date(Math.max(...this.tweets.map(t => new Date(t.timestamp)))).toISOString().split('T')[0]
            },
            contentTypes: {
                withImages: this.tweets.filter(t => t.text.includes('photo')).length,
                withVideos: this.tweets.filter(t => t.text.includes('video')).length,
                withLinks: this.tweets.filter(t => t.text.includes('http')).length,
                textOnly: this.tweets.filter(t => !t.text.includes('http') && !t.text.includes('photo') && !t.text.includes('video')).length
            }
        };
    }

    async close() {
        if (this.browser && this.browser.isConnected()) {
            await this.browser.disconnect();
            console.log(chalk.blue('🔌 Disconnected from browser'));
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const username = args[0];
    const maxTweets = args[1] ? parseInt(args[1]) : 500;

    if (!username) {
        console.error(chalk.red('Please provide a username:'));
        console.error(chalk.white('Example: node local_browser_scraper.js marclouvion'));
        console.error(chalk.white('Example: node local_browser_scraper.js marclouvion 300'));
        process.exit(1);
    }

    console.log(chalk.bold.cyan(`🐦 Extracting tweets from @${username}`));
    console.log(chalk.cyan(`📊 Max tweets: ${maxTweets}`));
    console.log(chalk.dim('═'.repeat(50)));

    const scraper = new LocalBrowserScraper(username, maxTweets);

    try {
        // Connect to browser
        const connected = await scraper.connectToBrowser();
        if (!connected) {
            console.error(chalk.red('Failed to connect to browser'));
            process.exit(1);
        }

        // Set up page
        await scraper.setupPage();

        // Navigate to profile
        const navigated = await scraper.navigateToTwitterProfile();
        if (!navigated) {
            console.error(chalk.red('Failed to navigate to profile'));
            process.exit(1);
        }

        // Check login status
        const isLoggedIn = await scraper.checkIfLoggedIn();
        if (!isLoggedIn) {
            console.error(chalk.red('Not logged in to Twitter'));
            process.exit(1);
        }

        // Extract tweets
        const tweets = await scraper.extractTweets();
        if (tweets.length === 0) {
            console.error(chalk.red('No tweets extracted'));
            process.exit(1);
        }

        // Save data
        const { baseDir, stats } = await scraper.saveTweets();

        // Display results
        console.log(chalk.bold.green('\n📊 Extraction Results:'));
        console.log(chalk.cyan(`• Total Tweets: ${stats.totalTweets}`));
        console.log(chalk.cyan(`• Original Tweets: ${stats.directTweets}`));
        console.log(chalk.cyan(`• Date Range: ${stats.timeRange.start} to ${stats.timeRange.end}`));
        console.log(chalk.cyan(`• Total Likes: ${stats.engagement.totalLikes.toLocaleString()}`));
        console.log(chalk.cyan(`• Total Retweets: ${stats.engagement.totalRetweetCount.toLocaleString()}`));

        // Keep browser open for user to see
        console.log(chalk.yellow('\n🌐 Browser window will remain open for you to review...'));
        console.log(chalk.gray('Press Ctrl+C to close when finished'));

    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        await scraper.close();
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n👋 Shutting down gracefully...'));
    process.exit(0);
});

main().catch(console.error);