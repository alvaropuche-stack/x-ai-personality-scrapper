import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import chalk from 'chalk';
import ora from 'ora';

// Handle __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get arguments
const args = process.argv.slice(2);
const username = args[0] || 'Vinci_Strive';
const date = args[1] || new Date().toISOString().split('T')[0];
console.log(`Generating Virtuals character for ${username} on ${date}`);

try {
    // Read the merged tweets and stats
    const stats = JSON.parse(fs.readFileSync(path.join(__dirname, `pipeline/${username}/${date}/analytics/stats.json`), 'utf8'));
    const tweets = JSON.parse(fs.readFileSync(path.join(__dirname, `pipeline/${username}/${date}/raw/tweets.json`), 'utf8'));
    const mergeStats = JSON.parse(fs.readFileSync(path.join(__dirname, `pipeline/${username}/${date}/raw/merge_stats.json`), 'utf8'));

    const recentTweets = tweets.slice(0, 20);
    const recentTweetsText = recentTweets.map(tweet => tweet.text).join('\n');
    const topTweets = tweets
        .sort((a, b) => (b.likes + b.retweetCount) - (a.likes + a.retweetCount))
        .slice(0, 10)
        .map(tweet => tweet.text)
        .join('\n');

    const formatJSON = (json) => {
        const colorize = {
            name: chalk.green,
            handler: chalk.blue,
            bio: chalk.yellow,
            description: chalk.magenta,
            forum_start_system_prompt: chalk.cyan,
            forum_end_system_prompt: chalk.cyan,
            twitter_start_system_prompt: chalk.cyan,
            twitter_end_system_prompt: chalk.cyan
        };

        return Object.entries(json)
            .map(([key, value]) => {
                const colorFn = colorize[key] || chalk.white;
                return `${chalk.white(key)}: ${colorFn(value)}`;
            })
            .join('\n');
    };

    async function main() {
        console.log('\n' + chalk.bold.cyan('📥 INPUT DATA SUMMARY'));
        console.log(chalk.dim('═'.repeat(50)));

        console.log(chalk.bold.yellow('👤 Merged Character:'));
        console.log(chalk.dim('─'.repeat(30)));
        console.log(chalk.white(`Name: ${username}`));
        console.log(chalk.white(`Source Accounts: ${mergeStats.sourceAccounts.join(', ')}`));
        console.log(chalk.white(`Total Tweets: ${mergeStats.totalTweets}`));

        console.log('\n' + chalk.bold.magenta('🔥 Top Tweets:'));
        console.log(chalk.dim('─'.repeat(30)));
        tweets
            .sort((a, b) => (b.likes + b.retweetCount) - (a.likes + a.retweetCount))
            .slice(0, 5)
            .forEach((tweet, index) => {
                console.log(chalk.cyan(`${index + 1}.`), chalk.white(tweet.text));
                console.log(chalk.dim(`   💗 ${tweet.likes} likes • 🔄 ${tweet.retweetCount} retweets`));
            });

        console.log('\n' + chalk.bold.green('📝 Recent Tweets:'));
        console.log(chalk.dim('─'.repeat(30)));
        recentTweets.forEach((tweet, index) => {
            console.log(chalk.cyan(`${index + 1}.`), chalk.white(tweet.text));
            console.log(chalk.dim(`   📅 ${new Date(tweet.timestamp).toLocaleDateString()} • @${tweet.username}`));
        });

        console.log(chalk.dim('═'.repeat(50)) + '\n');

        const prompt = `You are tasked with creating a detailed character card based on a merged AI character that combines the personalities and writing styles of multiple Twitter users. This character card will be used to generate AI responses that mimic the combined personality. Your goal is to create a comprehensive and accurate representation of this merged character.

The output should be a JSON object with the following structure:

{
    "name": string,
    "handler": string,
    "bio": string,
    "description": string,
    "forum_start_system_prompt": string,
    "forum_end_system_prompt": string,
    "twitter_start_system_prompt": string,
    "twitter_end_system_prompt": string
}

Here is the merged character information you'll be working with:

Handler: ${username}
Name: ${username}
Source Accounts: ${mergeStats.sourceAccounts.join(', ')}
Total Tweets Combined: ${mergeStats.totalTweets}

Top Tweets from All Accounts:
<top_tweets>
${topTweets}
</top_tweets>

Recent Tweets:
<recent_tweets>
${recentTweetsText}
</recent_tweets>

This character combines the expertise and personalities from:
${mergeStats.sourceAccounts.map(account => `- @${account}`).join('\n')}

To create the character card, follow these steps:

1. Name: Create an AI Agent name that reflects the combined expertise. "${username}" should be interpreted as a meaningful name that captures the essence of the combined personalities.

2. Handler: Use the provided username.

3. Bio: Create a concise, engaging biography (1-2 sentences) that captures the essence of this merged persona based on the combined expertise from the source accounts.

4. Description: Write a detailed description (3-5 paragraphs) of the character, including:
   - Background that combines the expertise areas from the source accounts
   - Personality traits reflected in the tweet data
   - Interests and topics frequently discussed in the tweets
   - Writing style observed in the combined content
   - Unique perspective that emerges from this blend of expertise

5. Forum Start System Prompt: Write instructions for an AI to emulate this character in a forum setting. Include:
   - The combined expertise areas observed from the source accounts
   - Communication style and approach to problem-solving seen in the tweets
   - Key topics and themes they frequently discuss
   - How they share knowledge and engage with others

6. Forum End System Prompt: Provide additional guidelines for maintaining character consistency, such as:
   - Tone and communication style observed in the tweets
   - How they structure their arguments and explanations
   - Ways they engage with community and share knowledge

7. Twitter Start System Prompt: Create instructions for generating tweets in this merged style. Include:
   - Topics and themes they frequently tweet about
   - Their typical tweet structure and communication patterns
   - How they share insights, tips, or observations
   - Engagement style with their audience

8. Twitter End System Prompt: Add final guidelines for tweet generation, such as:
   - Frequency and variety of topics covered
   - Language patterns and terminology used
   - Balance between different types of content (insights, questions, shares)

When writing the character card, pay close attention to:
- The communication patterns and writing style observed in the tweets
- The mix of topics and expertise areas from the source accounts
- How they engage with their audience and community
- The tone and personality that emerges from the combined content
- Authentic patterns that make this character unique

Ensure that the character description and prompts are detailed enough to capture this unique multi-domain expertise while allowing for creative expansion in AI-generated responses.

Format your response as a valid JSON object, with each field containing the appropriate content as described above. Do not include any additional commentary or explanations outside of the JSON structure.`;

        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
            console.log(chalk.yellow('⚠️  OpenAI API key not found. Creating a template character card instead...'));

            // Create a template character card without AI
            const templateCharacter = {
                name: username,
                handler: `@${username}`,
                bio: `Combined expertise from ${mergeStats.sourceAccounts.join(', ')} creating a unique multi-domain perspective.`,
                description: `${username} represents the fusion of expertise from multiple Twitter accounts: ${mergeStats.sourceAccounts.join(', ')}. This character embodies the combined knowledge, communication style, and personality traits observed across these source accounts.\n\nThe character draws from the diverse experiences and perspectives shared in the collected tweets, creating a unique voice that reflects the merged expertise. This includes the topics they frequently discuss, their approach to problem-solving, and the ways they engage with their audience.\n\nBy analyzing the patterns in language, topics, and communication style from the source accounts, this character emerges as a distinct persona that captures the essence of the combined personalities while maintaining authenticity based on the actual tweet data.\n\nThe character brings together insights from various domains, creating a comprehensive perspective that can draw connections between different areas of expertise and share knowledge in a way that reflects the authentic voice of the source accounts.`,
                forum_start_system_prompt: `You are ${username}, a character that combines the expertise and communication style from multiple source accounts. When participating in forums:\n\n- Share insights based on the combined knowledge and experience areas\n- Communicate in a style that reflects the patterns observed in the source tweets\n- Provide valuable perspectives that draw from multiple domains of expertise\n- Engage constructively with others while maintaining the authentic voice\n- Focus on sharing practical knowledge and helpful insights\n- Be genuine and authentic in your communication style\n- Draw connections between different topics and areas of expertise`,
                forum_end_system_prompt: `Remember to maintain ${username}'s authentic voice based on the source accounts. Stay consistent with the communication patterns and topics observed in the tweet data. Be helpful and constructive in forum discussions while maintaining the character's unique perspective that emerges from the combined expertise.`,
                twitter_start_system_prompt: `As ${username}, generate content that reflects the combined expertise and style from the source accounts. Your content should:\n\n- Cover topics and themes observed in the source tweets\n- Use language patterns and communication style that feels authentic\n- Share insights, tips, or observations consistent with the source material\n- Engage with audiences in a way that reflects the original communication patterns\n- Maintain authenticity while drawing from the combined knowledge base`,
                twitter_end_system_prompt: `Maintain the authentic voice and communication style observed in the source accounts. Focus on topics and themes that are consistent with the merged expertise. Be genuine and engaging while staying true to the character's personality and knowledge areas as reflected in the tweet data.`
            };

            const formattedJson = formatJSON(templateCharacter);
            console.log('\n' + chalk.cyan('Character Details:'));
            console.log(chalk.dim('─'.repeat(50)));
            console.log(formattedJson);
            console.log(chalk.dim('─'.repeat(50)));

            const characterDir = path.join(__dirname, `pipeline/${username}/${date}/character`);
            fs.mkdirSync(characterDir, { recursive: true });
            fs.writeFileSync(
                path.join(characterDir, 'character.json'),
                JSON.stringify(templateCharacter, null, 2)
            );
            console.log(chalk.green('Character saved to:'), characterDir);
            return;
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const spinner = ora('Generating character...').start();

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{role: 'user', content: prompt}],
                response_format: {type: 'json_object'},
            });

            const responseJson = JSON.parse(response.choices[0].message.content);
            const formattedJson = formatJSON(responseJson);
            spinner.succeed('Character generated successfully!');
            console.log('\n' + chalk.cyan('Character Details:'));
            console.log(chalk.dim('─'.repeat(50)));
            console.log(formattedJson);
            console.log(chalk.dim('─'.repeat(50)));

            const characterDir = path.join(__dirname, `pipeline/${username}/${date}/character`);
            fs.mkdirSync(characterDir, { recursive: true });
            fs.writeFileSync(
                path.join(characterDir, 'character.json'),
                JSON.stringify(responseJson, null, 2)
            );
            console.log(chalk.green('Character saved to:'), characterDir);
        } catch (error) {
            spinner.fail('Failed to generate character');
            console.error(chalk.red('Error:'), error.message);
        }
    }

    main().catch(console.error);

} catch (error) {
    console.error(chalk.red('Error reading data files:'), error.message);
    console.log(chalk.yellow('Make sure the merged character data exists in pipeline/'), username, '/', date);
}