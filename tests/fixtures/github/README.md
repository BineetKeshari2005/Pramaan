# GitHub API Test Fixtures

These fixtures contain trimmed real API responses from GitHub to ensure offline, deterministic testing without calling the live GitHub API in CI.

## Recording Date
2026-10-31

## Sources

### Issue
- **Target URL**: https://github.com/github/gitignore/issues/3800
- **API Endpoints**:
  - `GET /repos/github/gitignore/issues/3800` (`issue-3800.json`)
  - `GET /repos/github/gitignore/issues/3800/comments?per_page=30` (`issue-3800-comments.json`)
  - `GET /repos/github/gitignore` (`repo-gitignore.json`)
  - `GET /repos/github/gitignore/commits?sha=main&until=2021-08-04T11:18:29Z&per_page=1` (`issue-3800-commits.json`)

### Pull Request
- **Target URL**: https://github.com/github/gitignore/pull/4934
- **API Endpoints**:
  - `GET /repos/github/gitignore/issues/4934` (`pull-4934-issue.json`)
  - `GET /repos/github/gitignore/issues/4934/comments?per_page=30` (`pull-4934-comments.json`)
  - `GET /repos/github/gitignore/pulls/4934` (`pull-4934-pull.json`)
  - `GET /repos/github/gitignore/pulls/4934/files?per_page=100` (`pull-4934-files.json`)
