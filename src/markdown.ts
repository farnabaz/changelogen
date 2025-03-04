import { upperFirst } from 'scule'
import { convert } from 'convert-gitmoji'
import type { ChangelogConfig } from './config'
import type { GitCommit, Reference } from './git'

export function generateMarkDown (commits: GitCommit[], config: ChangelogConfig) {
  const typeGroups = groupBy(commits, 'type')

  const markdown: string[] = []
  const breakingChanges = []

  // Version Title
  const compareLink = config.github ? `https://github.com/${config.github}/compare/${config.from}...${config.to}` : ''
  markdown.push('',
    '## ' + (compareLink ? `[${config.to}](${compareLink})` : `${config.to} (${config.from}..${config.to})`)
    , '')

  for (const type in config.types) {
    const group = typeGroups[type]
    if (!group || !group.length) {
      continue
    }

    markdown.push('', '### ' + config.types[type].title, '')
    for (const commit of group.reverse()) {
      const line = formatCommit(commit, config)
      markdown.push(line)
      if (commit.isBreaking) {
        breakingChanges.push(line)
      }
    }
  }

  if (breakingChanges.length) {
    markdown.push(
      '', '#### ⚠️  Breaking Changes', '',
      ...breakingChanges
    )
  }

  let authors = commits.flatMap(commit => commit.authors.map(author => formatName(author.name)))
  authors = uniq(authors).sort()

  if (authors.length) {
    markdown.push(
      '', '### ' + '❤️  Contributors', '',
      ...authors.map(name => '- ' + name)
    )
  }

  return convert(markdown.join('\n').trim(), true)
}

function formatCommit (commit: GitCommit, config: ChangelogConfig) {
  return '  - ' +
  (commit.scope ? `**${commit.scope.trim()}:** ` : '') +
  (commit.isBreaking ? '⚠️  ' : '') +
  upperFirst(commit.description) +
  formatReferences(commit.references, config)
}

const refTypeMap: Record<Reference['type'], string> = {
  'pull-request': 'pull',
  hash: 'commit',
  issue: 'ssue'
}

function formatReference (ref: Reference, config: ChangelogConfig) {
  if (!config.github) {
    return ref.value
  }
  return `[${ref.value}](https://github.com/${config.github}/${refTypeMap[ref.type]}/${ref.value.replace(/^#/, '')})`
}

function formatReferences (references: Reference[], config: ChangelogConfig) {
  const pr = references.filter(ref => ref.type === 'pull-request')
  const issue = references.filter(ref => ref.type === 'issue')
  if (pr.length || issue.length) {
    return ' (' + [...pr, ...issue].map(ref => formatReference(ref, config)).join(', ') + ')'
  }
  if (references.length) {
    return ' (' + formatReference(references[0], config) + ')'
  }
  return ''
}

// function formatTitle (title: string = '') {
//   return title.length <= 3 ? title.toUpperCase() : upperFirst(title)
// }

function formatName (name: string = '') {
  return name.split(' ').map(p => upperFirst(p.trim())).join(' ')
}

function groupBy (items: any[], key: string) {
  const groups = {}
  for (const item of items) {
    groups[item[key]] = groups[item[key]] || []
    groups[item[key]].push(item)
  }
  return groups
}

function uniq (items: any[]) {
  return Array.from(new Set(items))
}
