const core = require('@actions/core')
const github = require('@actions/github')
const matcher = require('matcher')
const getConfig = require('./utils/config')

const defaults = {
  feature: ['feature/*', 'feat/*'],
  fix: 'fix/*',
  chore: 'chore/*'
}

async function action(context = github.context) {
  try {

    var customConfigFile = '.github/pr-labeler.yml'; // default path of config file
    // if env variable CONFIG_FILENAME isset use it as the path to a custom pr-labeler config yml
    if(process.env.CONFIG_FILENAME !== null) {
        customConfigFile = process.env.CONFIG_FILENAME;
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const octokit = new github.GitHub(GITHUB_TOKEN)
    const repoInfo = {
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name
    }

    if (!context.payload.pull_request) {
      throw new Error(
        "Payload doesn't contain `pull_request`. Make sure this Action is being triggered by a pull_request event (https://help.github.com/en/articles/events-that-trigger-workflows#pull-request-event-pull_request)."
      )
    }

    const ref = context.payload.pull_request.head.ref;

    /**
     * load custom config when existing or
     * set default config when no custom overwrite exists
     */
    var config = defaults;
    var customConfig = await getConfig(octokit, customConfigFile, repoInfo, ref);
    if(customConfig !== null) {
        config = customConfig;
    }

    const labelsToAdd = Object.entries(config).reduce(
      (labels, [label, patterns]) => {
        if (
          Array.isArray(patterns)
            ? patterns.some(pattern => matcher.isMatch(ref, pattern))
            : matcher.isMatch(ref, patterns)
        ) {
          labels.push(label)
        }

        return labels
      },
      []
    )

    if (labelsToAdd.length > 0) {
      await octokit.issues.addLabels({
        number: context.payload.pull_request.number,
        labels: labelsToAdd,
        ...repoInfo
      })
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      throw error
    }

    core.error(error)
    core.setFailed(error.message)
  }
}

module.exports = action
