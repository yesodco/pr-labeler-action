import * as core from '@actions/core'
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context'
import matcher from 'matcher'
import { Config } from './utils/config'

const defaultConfig = {
  ':sparkles: Deploy to DEV': 'develop',
  ':sparkles: Deploy to PROD': 'master'
}

async function action(context: Context = github.context) {
  try {
    const GITHUB_TOKEN = core.getInput('repo-token', { required: true })
    const octokit = new github.GitHub(GITHUB_TOKEN)

    if (!context.payload.pull_request) {
      throw new Error(
        "Payload doesn't contain `pull_request`. Make sure this Action is being triggered by a pull_request event (https://help.github.com/en/articles/events-that-trigger-workflows#pull-request-event-pull_request)."
      )
    }

    const baseRef: string = context.payload.pull_request.base.ref
    const config = defaultConfig
    const labelsToAdd = getLabelsToAdd(config, baseRef)

    if (labelsToAdd.length > 0) {
      await octokit.issues.addLabels({
        ...context.repo,
        number: context.payload.pull_request.number,
        labels: labelsToAdd
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

function getLabelsToAdd(config: Config, branchName: string): string[] {
  return Object.entries(config).reduce(
    (labels, [label, patterns]) => {
      if (
        Array.isArray(patterns)
          ? patterns.some(pattern => matcher.isMatch(branchName, pattern))
          : matcher.isMatch(branchName, patterns)
      ) {
        labels.push(label)
      }

      return labels
    },
    [] as string[]
  )
}

export default action
