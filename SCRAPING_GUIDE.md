# X-Scraper - Twitter Scraping Guide

## Overview

This guide shows you how to use the Twitter scraping system to collect data from specific accounts and then create combined AI characters.

## Quick Usage

### 1. Single Account Scraping
```bash
npm run scrape username
```

### 2. Multiple Account Scraping
```bash
npm run scrape username1 username2 username3
```

### 3. Specific Example (requested accounts)
```bash
npm run scrape 0x_Sero marc_louvion levelsio
```

### 4. Create Combined Character
```bash
npm run merge-characters Vinci_Strive 0x_Sero marc_louvion levelsio
```

### 5. Use Interactive CLI
```bash
npm run interactive
```

## Required Configuration

### Environment Variables (.env)
Create a `.env` file in the project root:

```bash
# Twitter Authentication (Required)
TWITTER_USERNAME=your_username
TWITTER_PASSWORD=your_password
TWITTER_EMAIL=your_email

# Scraping Configuration (Optional)
MAX_TWEETS=1000
MAX_RETRIES=3
RETRY_DELAY=10
MIN_DELAY=3
MAX_DELAY=8
DEBUG=true

# AI Integration (Optional)
OPENAI_API_KEY=your_openai_key
TOGETHER_API_KEY=your_together_key
```

### Cookies (Recommended)
For better performance, configure cookies:

1. **Automatic Method**: The system will automatically save cookies after the first successful login
2. **Manual Method**: Place your `x-cookies.json` file in the project root

## File Structure

### Scraping Results
```
pipeline/
├── username/
│   └── YYYY-MM-DD/
│       ├── raw/tweets.json          # Complete raw data
│       ├── processed/finetuning.jsonl  # AI training data
│       ├── analytics/stats.json     # Statistics and analysis
│       ├── exports/summary.md       # Readable summary
│       └── meta/                    # Process metadata
```

### Main Scripts
- `scrape-accounts.js` - Main scraping script
- `src/twitter/index.js` - Original pipeline
- `src/twitter/merge_characters.js` - Character merging
- `interactive-cli.js` - Complete interactive CLI

## Scraping Methods

### 1. Main Method (Agent Twitter Client)
- Faster and more efficient
- Extracts complete metadata
- Requires cookies/credentials configuration
- May be blocked by Cloudflare

### 2. Fallback Method (Puppeteer)
- More robust against blocking
- Simulates human behavior
- Slower
- Uses more resources

## Complete Example

### Step 1: Scraping 3 Accounts
```bash
npm run scrape user1 user2 user3
```

**Expected Output:**
```
X-Scraper - Multiple Account Scraping
========================================

Account 1/3: @user1
Scraping @user1
========================================
Validating environment...
Initializing scraper...
Collecting tweets...
Successfully collected 523 tweets in 45s
Stats: 342 original, 125 retweets, 56 replies

Waiting 30 seconds before next account...

Account 2/3: @user2
[... similar process ...]

Account 3/3: @user3
[... similar process ...]

Scraping Summary
========================================
Successful: 3 accounts
Total tweets collected: 1,247
```

### Step 2: Create Combined Character
```bash
npm run merge-characters CharacterName user1 user2 user3
```

**Interactive Configuration:**
- How many tweets per account?: 50
- Exclude retweets?: Yes
- Sort by?: Total engagement

### Step 3: Results
The character `CharacterName` will be saved in:
```
pipeline/CharacterName/2025-10-27/
├── raw/tweets.json          # 150 combined tweets
├── processed/finetuning.jsonl  # Ready for AI
├── analytics/stats.json     # Combined statistics
└── exports/summary.md       # Generated biography
```

## Troubleshooting

### Error: Cloudflare Block
```bash
Failed to scrape @username: Sorry, you have been blocked
Suggestions:
   - Check your cookies configuration
   - Try using the browser-based scraper
   - Wait some time and try again
```

**Solution:**
1. Update your Twitter cookies
2. Use `node local_browser_scraper.js username` as alternative
3. Wait a few minutes and retry

### Error: Authentication Failed
```bash
Failed to scrape @username: Authentication failed
Suggestions:
   - Check your TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL
   - Verify your cookies are up to date
```

**Solution:**
1. Verify your credentials in `.env`
2. Delete old cookies and re-authenticate
3. Ensure your Twitter account is not suspended

### Error: No Tweets Collected
```bash
No tweets collected
```

**Solution:**
1. Verify the username exists
2. The account may be private
3. The account may not have public tweets

## Metrics and Analysis

The system automatically generates:

### Per-Account Statistics
- Total tweets collected
- Original tweets vs retweets vs replies
- Average engagement (likes, retweets)
- Most frequent words
- Hashtags used

### Combined Statistics
- Combined personality analysis
- Common topics between accounts
- Merged writing style
- Data ready for AI training

## Complete Workflow

```bash
# 1. Set up environment
echo "TWITTER_USERNAME=your_user" > .env
echo "TWITTER_PASSWORD=your_pass" >> .env
echo "TWITTER_EMAIL=your_email" >> .env

# 2. Scrape accounts
npm run scrape user1 user2 user3

# 3. Create combined character
npm run merge-characters CharacterName user1 user2 user3

# 4. Generate AI character (optional)
npm run character CharacterName

# 5. Train model (optional)
npm run finetune
```

## Additional Resources

- **Technical Documentation**: Check `src/twitter/TwitterPipeline.js`
- **Interactive CLI**: Run `npm run interactive` for friendly interface
- **Browser Scraper**: Use `node local_browser_scraper.js username` as fallback
- **Character Generation**: Use `npm run generate-virtuals` for Virtuals protocol

## Important Notes

- **Reset rate limits**: Wait between scraping accounts
- **Legal**: Only scrape public accounts and respect Twitter ToS
- **Privacy**: Don't scrape private or sensitive information
- **Responsibility**: Use data ethically and responsibly