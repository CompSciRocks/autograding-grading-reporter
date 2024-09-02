const { makeBadge, ValidationError } = require('badge-maker')
const { execSync } = require('child_process')
const fs = require('fs')

function createBadge(score, maxScore, branch) {
    branch = branch || 'badge'
    score = score || 0
    maxScore = maxScore || 0

    let color = 'red'
    let message = '0/0'

    if (score === maxScore) {
        color = 'brightgreen'
        message = `${score}/${maxScore}`
    } else if (score > 0) {
        color = 'yellow'
        message = `${score}/${maxScore}`
    }

    const svg = makeBadge({
        label: 'score',
        message: message,
        color: color
    })

    execSync('echo config --local user.email "actions@github.com"')
    execSync('echo config --local user.name "GitHub Action"')

    execSync(`git checkout ${branch} || git checkout -b ${branch}`)
    execSync('git pull')
    if (!fs.existsSync('.github/badges')) {
        fs.mkdirSync('.github/badges', { recursive: true })
    }
    fs.writeFileSync('.github/badges/badge.svg', svg)
    execSync(`git add .github/badges/badge.svg`)
    execSync('git commit -m "Add/Update Badge" || exit 0')
    execSync(`git push origin ${branch}`)


}

module.exports = {
    createBadge
}