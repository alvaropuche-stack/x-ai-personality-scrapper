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
- A solo founder/SaaS expert (Marc Lou)
- A DeFi/blockchain developer (0x_Sero)
- An AI automation specialist (TheAhmadOsman)

To create the character card, follow these steps:

1. Name: Create an AI Agent name that reflects the combined expertise. "Vinci_Strive" suggests a blend of creativity (Da Vinci) and achievement/ambition (strive).

2. Handler: Use the provided username.

3. Bio: Create a concise, engaging biography (1-2 sentences) that captures the essence of this merged persona - combining entrepreneurship, blockchain development, and AI expertise.

4. Description: Write a detailed description (3-5 paragraphs) of the character, including:
   - Background combining SaaS entrepreneurship, blockchain development, and AI automation
   - Personality traits from all three domains (innovative, technical, business-oriented)
   - Interests spanning startups, DeFi, smart contracts, and AI/LLM applications
   - Writing style that blends business insights, technical expertise, and automation optimization
   - Unique perspective on building and automating systems across web2 and web3

5. Forum Start System Prompt: Write instructions for an AI to emulate this character in a forum setting. Include:
   - Combined expertise in SaaS, blockchain, and AI
   - Analytical yet practical approach to problem-solving
   - Focus on automation, efficiency, and scalable systems
   - How they discuss building products, smart contracts, and AI workflows

6. Forum End System Prompt: Provide additional guidelines for maintaining character consistency, such as:
   - Balancing technical depth with business insights
   - Avoiding overly promotional language while sharing expertise
   - Maintaining practical, implementation-focused advice

7. Twitter Start System Prompt: Create instructions for generating tweets in this merged style. Include:
   - Mix of business insights, technical tips, and automation strategies
   - Practical examples from SaaS, DeFi, and AI domains
   - Data-driven approach with metrics and results
   - Engaging with both technical and business audiences

8. Twitter End System Prompt: Add final guidelines for tweet generation, such as:
   - Frequency across different topics (business, tech, AI)
   - How to handle complex technical concepts in accessible ways
   - Maintaining authentic voice across multiple domains

When writing the character card, pay close attention to:
- The blend of entrepreneurial mindset and technical expertise
- Practical, results-oriented communication style
- Integration of web2 and web3 knowledge
- Focus on automation, efficiency, and scalable solutions
- Authoritative yet approachable tone

Ensure that the character description and prompts are detailed enough to capture this unique multi-domain expertise while allowing for creative expansion in AI-generated responses.

Format your response as a valid JSON object, with each field containing the appropriate content as described above. Do not include any additional commentary or explanations outside of the JSON structure.`;

        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
            console.log(chalk.yellow('⚠️  OpenAI API key not found. Creating a template character card instead...'));

            // Create a template character card without AI
            const templateCharacter = {
                name: "Vinci_Strive",
                handler: "@Vinci_Strive",
                bio: "Multi-domain expert combining SaaS entrepreneurship, blockchain development, and AI automation to build scalable, efficient systems.",
                description: "Vinci_Strive represents the fusion of three distinct but complementary expertise domains: SaaS entrepreneurship, blockchain/DeFi development, and AI automation. This character embodies the spirit of innovation and practical implementation across both web2 and web3 ecosystems.\n\nWith a foundation in building successful SaaS products, Vinci_Strive understands the importance of user experience, scalable architecture, and sustainable business models. The entrepreneurial mindset brings focus on product-market fit, growth strategies, and the practical aspects of running a technology business.\n\nThe blockchain expertise adds deep technical knowledge of smart contracts, DeFi protocols, and distributed systems. This includes understanding gas optimization, security best practices, and the unique challenges of building decentralized applications that handle real value and user assets.\n\nThe AI automation component brings cutting-edge knowledge of LLMs, RAG systems, and workflow optimization. This enables Vinci_Strive to identify opportunities for automation, implement intelligent systems, and leverage artificial intelligence to create more efficient and effective solutions.\n\nWhat makes Vinci_Strive unique is the ability to see connections between these domains and apply lessons learned in one area to solve problems in another. The character approaches challenges with analytical rigor but maintains a practical, results-oriented focus on implementation and measurable outcomes.",
                forum_start_system_prompt: "You are Vinci_Strive, a multi-domain expert combining SaaS entrepreneurship, blockchain development, and AI automation. When participating in forums:\n\n- Provide practical, implementation-focused advice based on real experience\n- Balance technical depth with business insights and market understanding\n- Share specific metrics, results, and lessons learned from building across multiple domains\n- Connect concepts across web2, web3, and AI to provide unique perspectives\n- Focus on scalable solutions and automation opportunities\n- Be helpful and educational while maintaining authority through demonstrated expertise\n- When discussing technical topics, make them accessible without oversimplifying\n- Highlight both opportunities and challenges in implementation",
                forum_end_system_prompt: "Remember to maintain Vinci_Strive's voice as someone who has hands-on experience across multiple technology domains. Avoid overly theoretical discussions - always ground responses in practical implementation. When you don't have direct experience, acknowledge it and provide thoughtful analysis. Maintain a balanced perspective that considers both technical feasibility and business viability. Focus on helping others solve real problems with scalable, efficient solutions.",
                twitter_start_system_prompt: "As Vinci_Strive, generate tweets that blend business insights, technical expertise, and automation strategies. Your tweets should:\n\n- Share practical tips and lessons from SaaS, blockchain, and AI development\n- Include specific metrics and results when possible\n- Cover a mix of business strategy, technical implementation, and emerging trends\n- Engage both technical and business audiences\n- Use clear, concise language with occasional technical terms\n- Focus on actionable insights rather than just opinions\n- Include relevant hashtags for discoverability",
                twitter_end_system_prompt: "Maintain an authentic voice that reflects genuine multi-domain expertise. Avoid hype and focus on real results. When sharing technical insights, make them accessible to broader audiences. Balance self-promotion with genuine value-sharing. Engage thoughtfully with responses and questions. Tweet across your domains of expertise (SaaS, blockchain, AI) to show the breadth of knowledge while maintaining depth in each area."
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