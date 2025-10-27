# X Strive Scraper

Pipeline for generating AI character files and training datasets by scraping public figures' online presence across Twitter and blogs.

> **IMPORTANT**: Create a new Twitter account for this tool. DO NOT use your main account as it may trigger Twitter's automation detection and result in account restrictions.

## Local Browser Scraping with Real Data

The scraper supports **real data extraction** using your authenticated browser session, giving you access to **500+ tweets per account** instead of just 50 public tweets.

### Setup for Real Data Extraction

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Extract Twitter Cookies (Recommended Method):**

   **Using Chrome Cookie Editor Extension:**
   - Install the "Cookie Editor" extension for Chrome
   - Log in to Twitter/X in Chrome
   - Go to `twitter.com` → Click the cookie icon → Export
   - Save the exported cookies as `x-cookies.json` in the project root

   **Key cookies needed:**
   - `auth_token` (most important)
   - `ct0` (csrf token)
   - `twid` (user ID)
   - `att` (authentication token)

3. **Create your cookies file:**
   ```bash
   # Create x-cookies.json with your exported cookies
   cp x-cookies-example.json x-cookies.json
   # Then edit x-cookies.json with your real cookies
   ```

## Data Extraction Methods

### Method 1: Real Data Extraction (Recommended)
```bash
node local_browser_scraper.js username
```
- **500-1000 tweets per account**
- Full tweet content with metrics
- Authenticated session access
- Human-like behavior to avoid detection

### Method 2: Basic Scraping (Limited)
```bash
npm run twitter -- username
```
- ~50 tweets (public only)
- Limited content access
- No authentication required

## Character Creation Workflow

### Step 1: Extract Real Data
```bash
# Extract from multiple accounts
node local_browser_scraper.js username1
node local_browser_scraper.js username2
node local_browser_scraper.js username3
```

### Step 2: Merge Characters
```bash
node merge_three_characters.js NewCharacterName username1 username2 username3
```

### Step 3: Generate Character Files
```bash
# Basic character
node src/character/GenerateCharacter.js NewCharacterName 2025-10-27

# Virtuals character card
node generate_merged_virtuals.js NewCharacterName 2025-10-27

# Final Virtuals character
npm run generate-merged-virtuals -- NewCharacterName 2025-10-27
```

## Generated Files Structure

```
pipeline/
├── username1/
│   └── 2025-10-27/
│       ├── raw/
│       │   └── tweets.json          # Real tweet data
│       ├── processed/
│       │   └── finetuning.jsonl     # Training data
│       └── analytics/
│           └── stats.json           # Statistics
├── NewCharacterName/
│   └── 2025-10-27/
│       ├── raw/
│       │   └── tweets.json          # Merged tweets (15+ per account)
│       └── character/
│           ├── character.json       # Virtuals character card
│           └── virtuals_character.json  # Final character
└── characters/
    └── new_character_name.json      # Basic character file
```

## Advanced Usage

### Collection with Date Range
```bash
node local_browser_scraper.js username --start-date 2025-01-01 --end-date 2025-01-31
```

### Blog Collection
```bash
npm run blog
```

### Model Training
```bash
npm run finetune          # Train model
npm run finetune:test     # Train with test split
```

## Configuration

### Environment Variables (.env)
```properties
# Scraping Configuration
MAX_TWEETS=1000           # Max tweets to extract
MAX_RETRIES=3            # Max retries for scraping
RETRY_DELAY=10           # Delay between retries (seconds)
MIN_DELAY=3              # Minimum delay between requests
MAX_DELAY=8              # Maximum delay between requests
```

### Cookie File Format (x-cookies.json)
```json
[
  {
    "name": "auth_token",
    "value": "your_auth_token_here",
    "domain": ".x.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  },
  {
    "name": "ct0",
    "value": "your_csrf_token_here",
    "domain": ".x.com",
    "path": "/",
    "secure": true,
    "httpOnly": false
  }
]
```

## Anti-Detection Features

The local browser scraper includes:

- **Human-like scrolling** - Gradual scroll increments
- **Random delays** - 3-7 seconds between actions
- **Natural pauses** - Reading time simulation
- **Stealth mode** - Automation detection avoidance
- **Cookie-based auth** - No login required
- **Rate limiting** - Built-in delays to prevent blocking

## Expected Results

With the new local browser method:

- **500-1000+ tweets per account** (vs ~50 public tweets)
- **Full tweet metrics** (likes, retweets, replies)
- **Complete content access** including media and links
- **Real engagement data** for authentic character creation

**Performance**: Can extract 1,000+ tweets from multiple accounts in 5-10 minutes

## Generated Character Features

The merged characters include:

- **Multi-domain expertise** combining knowledge from all source accounts
- **Real tweet examples** with actual engagement metrics
- **Authentic writing style** based on real content patterns
- **Virtuals Protocol compatibility** for AI agent integration
- **Fine-tuning ready datasets** in JSONL format
- **Complete personality profiles** with conversation examples

## Cookie Export Guide

### Using Cookie Editor Extension:
1. Install "Cookie Editor" from Chrome Web Store
2. Log in to Twitter/X
3. Click the cookie icon in your browser toolbar
4. Filter by "twitter.com" or "x.com"
5. Click "Export" → Save as `x-cookies.json`
6. Place the file in your project root directory

### Required Cookies:
- `auth_token` - Main authentication token
- `ct0` - CSRF protection token
- `twid` - Twitter user ID
- `att` - Additional authentication

## Important Notes

- **Account Safety**: Use a dedicated Twitter account
- **Rate Limits**: Built-in delays prevent API blocking
- **Data Privacy**: Store cookies securely
- **Terms of Service**: Respect Twitter's ToS and rate limits
- **Browser Window**: The scraper will open a visible browser window

## Troubleshooting

**Issue**: "No tweets extracted"
- Check your cookies are valid
- Ensure Twitter/X account is in good standing
- Try re-exporting cookies

**Issue**: "Retry button appears on Twitter"
- If you see the retry button, you must wait a while before continuing
- Do not force the process - Twitter is rate limiting you
- Wait 10-30 minutes before trying again
- Consider increasing delays in .env configuration

**Issue**: "Rate limited"
- Increase delays in .env configuration
- Wait longer between extraction sessions

**Issue**: "Authentication failed"
- Verify cookie format and values
- Check domain is set to ".x.com"
- Ensure cookies aren't expired