const core = require("@actions/core");
const github = require("@actions/github");
const { getTestScore, getMaxScoreForTest } = require('./helpers/test-helpers')
import { request } from '@octokit/request';

exports.SendFeedback = async function SendFeedback(runnerResults) {

    let shouldSend = core.getInput("send_feedback");

    // Has to be either always, never, or when_available
    if (shouldSend !== "always" && shouldSend !== "never" && shouldSend !== "when_available") {
        core.setFailed("send_feedback must be either 'always', 'never', or 'when_available'");
        return;
    }

    if (shouldSend === "never") {
        // Skipping feedback
        return;
    }

    let markdownList = [];

    runnerResults.forEach(({ runner, results }) => {
        if (results.markdown && results.markdown.length > 0) {
            // Have to base64 decode the results

            let testMarkdown = '-----\n\n';
            testMarkdown += '### Test: ' + results.tests[0].name + '\n\n';
            let decoded = Buffer.from(results.markdown, 'base64').toString('utf-8');
            testMarkdown += decoded;
            markdownList.push(testMarkdown);
        }
    });

    if (shouldSend === 'when_available' && markdownList.length === 0) {
        // No feedback from the runners, settings say to skip
        return;
    }

    let maxScore = 0;
    let score = 0;

    runnerResults.forEach(({ results }) => {
        maxScore += results.max_score;
        results.tests.forEach((test) => {
            score += test.score;
        });
    });

    if (isNaN(score)) { score = 0; }
    if (isNaN(maxScore)) { maxScore = 0; }

    let markdownText = '';

    markdownText = `# Feedback from autograding\n\n`;
    markdownText += 'Date: ' + new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + '\n\n';

    if (maxScore > 0) {
        // No button if no max score
        if (maxScore == score) {
            // 100%, green badge
            markdownText += '![](https://img.shields.io/badge/grading-' + score + '/' + maxScore + '-green)\n\n';
        } else if (score == 0) {
            // 0%, red badge
            markdownText += '![](https://img.shields.io/badge/grading-' + score + '/' + maxScore + '-red)\n\n';
        } else {
            // Partial credit, yellow badge
            markdownText += '![](https://img.shields.io/badge/grading-' + score + '/' + maxScore + '-yellow)\n\n';
        }
    }

    if (markdownList.length > 0) {
        markdownText += markdownList.join('\n\n');
    }


    const token = process.env.GITHUB_TOKEN || core.getInput("token");
    if (!token || token === "") {
        core.setFailed("No token provided");
        return;
    }

    const octokit = github.getOctokit(token);
    if (!octokit) {
        core.setFailed("Failed to create octokit");
        return;
    }

    const nwo = process.env.GITHUB_REPOSITORY || "/";
    const [owner, repo] = nwo.split("/");
    if (!owner) {
        core.setFailed("Failed to get owner");
        return;
    }

    if (!repo) {
        core.setFailed("Failed to get repo");
        return;
    }

    // Check if there is an issue #1. 99% of the time that'll be the feedback
    // PR, assuming that GH Classroom set it up. If not, we'll just make an 
    // issue and use that. 
    let issueNumber = 1;
    try {
        const firstIssue = await octokit.rest.issues.get({
            owner: owner,
            repo: repo,
            issue_number: issueNumber,
        });
    } catch (error) {
        let newIssue = await octokit.rest.issues.create({
            owner: owner,
            repo: repo,
            title: 'Feedback',
            body: 'This issue is a place for you to see the run results of your code and for you and your teacher to discuss your code. **Do not close or merge this issue.** It must stay open for this to work. '
        });
        issueNumber = newIssue.data.number;
    }
    try {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: markdownText,
            title: "Autograding Feedback: " + new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
        });
    } catch (error) {
        core.setFailed("Failed to create comment: " + error.message);
    }


}