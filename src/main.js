const core = require("@actions/core");
const { ConsoleResults } = require("./console-results");
const { NotifyClassroom } = require("./notify-classroom");
const { SendFeedback } = require('./send-feedback');

try {
  const runnerResults = core
    .getInput("runners")
    .split(",")
    .map((runner) => {
      const encodedResults = process.env[`${runner.trim().toUpperCase()}_RESULTS`];
      const json = Buffer.from(encodedResults, "base64").toString("utf-8");
      return { runner, results: JSON.parse(json) };
    });

  ConsoleResults(runnerResults);
  NotifyClassroom(runnerResults);
  SendFeedback(runnerResults);

  if (runnerResults.some((r) => r.results.status === "fail")) {
    core.setFailed("Some tests failed.");
  } else if (runnerResults.some((r) => r.results.status === 'error')) {
    core.setFailed("Some tests errored.");
  }


  let result = {
    tests: [],
    pointsPossible: 0,
    pointsAwarded: 0,
  }

  runnerResults.forEach(({ results }) => {
    result.pointsPossible += results.max_score;
    results.tests.forEach((test) => {
      result.pointsAwarded += test.score;
    });
  });

  if (isNaN(result.pointsAwarded)) {
    result.pointsAwarded = 0;
  }

  core.exportVariable('POINTS_STRING', `${result.pointsAwarded}/${result.pointsPossible}`);

} catch (error) {
  const input = core.getInput("runners");
  const pattern = /^([a-zA-Z0-9-]+,)*[a-zA-Z0-9-]+$/
  if (!pattern.test(input)) {
    console.error("The runners input must be a comma-separated list of strings.");
    core.setFailed("The runners input must be a comma-separated list of strings.");
  } else {
    console.error(error.message)
    core.setFailed(error.message);
  }
}
