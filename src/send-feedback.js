const core = require("@actions/core");
const github = require("@actions/github");
const { getTestScore, getMaxScoreForTest } = require('./helpers/test-helpers')

exports.SendFeedback = async function SendFeedback(runnerResults) {

    let shouldSend = core.getInput("send_feedback");

    // Has to be either always, never, or when_available
    if (shouldSend !== "always" && shouldSend !== "never" && shouldSend !== "when_available") {
        core.setFailed("send_feedback must be either 'always', 'never', or 'when_available'");
        return;
    }

    if (shouldSend === "never") {
        // Skipping feedback
        console.info('Skipping feedback');
        return;
    }

    let markdownList = [];

    runnerResults.forEach(({ runner, results }) => {
        if (results.markdown && results.markdown.length > 0) {
            // Have to base64 decode the results
            let decoded = Buffer.from(results.markdown, 'base64').toString('utf-8');
            markdownList.push(decoded);
        }
    });

    if (shouldSend === 'when_available' && markdownList.length === 0) {
        // No feedback from the runners, settings say to skip
        console.info('No feedback available, skipping feedback');
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

    let markdownText = '';

    markdownText = `# Feedback from autograding\n\n`;
    markdownText += 'Date: ' + new Date().toLocaleString() + '\n\n';

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

    console.info(markdownText);

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

    // Get all PRs and find the first with title "Feedback"
    const { data: pullRequests } = await octokit.rest.pulls.list({
        owner,
        repo
    });

    let feedbackPR = null;
    let feedbackNumber = 0;
    for (let i = 0; i < pullRequests.length; i++) {
        const pr = pullRequests[i];
        if (pr.title === "Feedback") {
            feedbackPR = pr;
            feedbackNumber = pr.number;
            break;
        }
    }

    if (!feedbackPR) {
        // Create the PR and get the id


        // await octokit.createPullRequest({
        //     owner: owner,
        //     repo: repo,
        //     title: 'Feedback',
        //     body: 'This pull request is a place for you and your teacher to discuss your code. **Do not close or merge this pull request.**',
        //     head: 'feedback',
        //     base: 'main',
        //     update: true,
        //     forceFork: true,

        // }).then(pr => {
        //     feedbackPR = pr;
        //     feedbackNumber = pr.data.number;
        // })

        // // Create the feedback branch if it doesn't exist
        try {
            await octokit.rest.git.createRef({
                owner,
                repo,
                ref: 'refs/heads/feedback',
                sha: process.env.GITHUB_SHA
            });
        } catch (error) {
            core.setFailed("Failed to create branch: " + error.message);
        }


        const { data: newPR } = await octokit.rest.pulls.create({
            owner,
            repo,
            title: 'Feedback',
            head: 'feedback',
            base: 'main',
            body: 'This pull request is a place for you and your teacher to discuss your code. **Do not close or merge this pull request.**',

        });

        feedbackPR = newPR;
    }

    // Get the id
    // const feedbackPRNumber = feedbackPR.number;

    try {
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: feedbackNumber,
            body: markdownText,
            title: "Autograding Feedback: " + new Date().toLocaleString()
        });
    } catch (error) {
        core.setFailed("Failed to create comment: " + error.message);
    }


}