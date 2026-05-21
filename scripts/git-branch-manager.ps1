# Web3D Git Branch Manager
# Usage: .\scripts\git-branch-manager.ps1 <command> [args]

param(
    [Parameter(Mandatory=$true)]
    [string]$Command,

    [Parameter(Mandatory=$false)]
    [string]$BranchName
)

function Show-Help {
    Write-Host ""
    Write-Host "Web3D Git Branch Manager" -ForegroundColor Cyan
    Write-Host "================================"
    Write-Host ""
    Write-Host "Usage: .\scripts\git-branch-manager.ps1 <command> [branch-name]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start      Create new feature branch (requires name)"
    Write-Host "  publish    Push current branch to remote"
    Write-Host "  sync       Sync dev branch latest code"
    Write-Host "  merge-dev  Merge current branch to dev"
    Write-Host "  release    Release to master (admin only)"
    Write-Host "  hotfix     Create hotfix branch (requires name)"
    Write-Host "  status     Show current branch status"
    Write-Host "  list       List all branches"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\git-branch-manager.ps1 start feature/model-preview"
    Write-Host "  .\scripts\git-branch-manager.ps1 sync"
    Write-Host "  .\scripts\git-branch-manager.ps1 hotfix fix-login-crash"
    Write-Host ""
}

function Start-Feature {
    param([string]$name)

    if (-not $name) {
        Write-Host "Error: Please provide branch name" -ForegroundColor Red
        exit 1
    }

    Write-Host ">>> Switching to dev and pulling latest..." -ForegroundColor Cyan
    git checkout dev
    git pull origin dev

    Write-Host ">>> Creating feature branch: $name" -ForegroundColor Cyan
    git checkout -b $name

    Write-Host "OK Feature branch '$name' created" -ForegroundColor Green
    Write-Host "Tip: Run 'git push origin $name' after development" -ForegroundColor Yellow
}

function Publish-Branch {
    $currentBranch = git branch --show-current

    Write-Host ">>> Pushing branch '$currentBranch' to remotes..." -ForegroundColor Cyan
    git push origin $currentBranch
    git push github $currentBranch

    Write-Host "OK Branch pushed to Gitee and GitHub" -ForegroundColor Green
}

function Sync-Dev {
    $currentBranch = git branch --show-current

    if ($currentBranch -eq "dev") {
        Write-Host ">>> Pulling latest dev code..." -ForegroundColor Cyan
        git pull origin dev
    } else {
        Write-Host ">>> Stashing current work..." -ForegroundColor Cyan
        git stash

        Write-Host ">>> Switching to dev and pulling..." -ForegroundColor Cyan
        git checkout dev
        git pull origin dev

        Write-Host ">>> Switching back and merging dev..." -ForegroundColor Cyan
        git checkout $currentBranch
        git merge dev

        Write-Host ">>> Restoring stashed work..." -ForegroundColor Cyan
        git stash pop
    }

    Write-Host "OK Sync completed" -ForegroundColor Green
}

function Merge-To-Dev {
    $currentBranch = git branch --show-current

    if ($currentBranch -eq "dev" -or $currentBranch -eq "master") {
        Write-Host "Error: Cannot run on '$currentBranch' branch" -ForegroundColor Red
        exit 1
    }

    Write-Host ">>> Switching to dev..." -ForegroundColor Cyan
    git checkout dev

    Write-Host ">>> Merging branch '$currentBranch'..." -ForegroundColor Cyan
    git merge $currentBranch

    Write-Host ">>> Pushing to remotes..." -ForegroundColor Cyan
    git push origin dev
    git push github dev

    Write-Host "OK Branch '$currentBranch' merged to dev" -ForegroundColor Green
    Write-Host "Tip: Delete local branch with 'git branch -d $currentBranch'" -ForegroundColor Yellow
}

function Release-To-Master {
    Write-Host "WARNING: This will release to production!" -ForegroundColor Yellow
    $confirm = Read-Host "Confirm release to master? (yes/no)"

    if ($confirm -ne "yes") {
        Write-Host "Cancelled" -ForegroundColor Red
        exit 0
    }

    Write-Host ">>> Switching to master..." -ForegroundColor Cyan
    git checkout master
    git pull origin master

    Write-Host ">>> Merging dev branch..." -ForegroundColor Cyan
    git merge dev

    $version = Read-Host "Enter version tag (e.g., v1.0.0)"

    Write-Host ">>> Pushing and tagging..." -ForegroundColor Cyan
    git push origin master
    git push github master
    git tag $version
    git push origin $version
    git push github $version

    Write-Host "OK Version $version released to production" -ForegroundColor Green
}

function Start-Hotfix {
    param([string]$name)

    if (-not $name) {
        Write-Host "Error: Please provide branch name" -ForegroundColor Red
        exit 1
    }

    Write-Host ">>> Switching to master..." -ForegroundColor Cyan
    git checkout master
    git pull origin master

    Write-Host ">>> Creating hotfix branch: hotfix/$name" -ForegroundColor Cyan
    git checkout -b "hotfix/$name"

    Write-Host "OK Hotfix branch 'hotfix/$name' created" -ForegroundColor Green
    Write-Host "Tip: Merge to both master and dev after fixing" -ForegroundColor Yellow
}

function Show-Status {
    $currentBranch = git branch --show-current

    Write-Host ""
    Write-Host "Current Branch: $currentBranch" -ForegroundColor Cyan
    Write-Host "================================"
    Write-Host ""

    $status = git status --short
    if ($status) {
        Write-Host "Uncommitted changes:" -ForegroundColor Yellow
        git status --short
    } else {
        Write-Host "Working directory is clean" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Recent commits:" -ForegroundColor Cyan
    git log --oneline -5
}

function List-Branches {
    Write-Host ""
    Write-Host "Local Branches:" -ForegroundColor Cyan
    git branch

    Write-Host ""
    Write-Host "Remote Branches (Gitee):" -ForegroundColor Cyan
    git branch -r | Select-String "origin/"

    Write-Host ""
    Write-Host "Remote Branches (GitHub):" -ForegroundColor Cyan
    git branch -r | Select-String "github/"
}

# Main logic
switch ($Command.ToLower()) {
    "start" { Start-Feature -name $BranchName }
    "publish" { Publish-Branch }
    "sync" { Sync-Dev }
    "merge-dev" { Merge-To-Dev }
    "release" { Release-To-Master }
    "hotfix" { Start-Hotfix -name $BranchName }
    "status" { Show-Status }
    "list" { List-Branches }
    "help" { Show-Help }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}
