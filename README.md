## GitHub Classroom Autograding Reporter

### Overview

This is a tweaked version of the default GitHub Classroom autograding reporter that sends feedback to the student as markdown in either a feedback PR or issue. 

> [!NOTE}
> Since this creates issues or pull requests it does take updating the `permissions` field from the defaults. 

### Environment Variables

| Env Name | Description | Required |
|----------|-------------|----------|
| [RUNNER-ID]_RESULTS | The name is equal to the ID of the runner in all capitals followed by `_RESULTS` and the value is the result output from the runner. | Yes |

### Inputs

| Input Name | Description | Required |
|------------|-------------|----------|
| `runners` | A comma separated list of runner ids from previous steps  | Yes |

### Usage

1. Add the GitHub Classroom Reporter to your workflow.

```yaml
name: Autograding Tests
on:
  - push
  - workflow_dispatch
permissions:
  checks: write
  actions: read
  contents: write
  issues: write
  pull-requests: write
jobs:
  autograding:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Shout Test
        id: shout-test
        uses: classroom-resources/autograding-io-grader@v1
        with:
          test-name: Shout Test
          command: "./test/bin/shout.sh"
          input: hello
          expected-output: HELLO
          comparison-method: exact
          timeout: 10
          max-score: 10
      - name: A command test
        id: a-command-test
        uses: classroom-resources/autograding-command-grader@v1
        with:
          test-name: A command test
          setup-command: bundle install
          command: rspec hello_spec.rb
          timeout: 10
          max-score: 20
      - name: Python test
        id: python-test
        uses: classroom-resources/autograding-python-grader@v1
      - name: Python test with score
        id: python-test-with-score
        uses: classroom-resources/autograding-python-grader@v1
        with:
          max-score: 30
      - name: Autograding Reporter
        uses: ./
        env:
          SHOUT-TEST_RESULTS: "${{steps.shout-test.outputs.result}}"
          A-COMMAND-TEST_RESULTS: "${{steps.a-command-test.outputs.result}}"
          PYTHON-TEST_RESULTS: "${{steps.python-test.outputs.result}}"
          PYTHON-TEST-WITH-SCORE_RESULTS: "${{steps.python-test-with-score.outputs.result}}"
        with:
          runners: shout-test,a-command-test,python-test,python-test-with-score
```

