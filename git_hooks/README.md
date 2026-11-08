# Git Hooks

## How to apply

Either copy the files to the default `.git/hooks` directory or change the hook directory:

```sh
git config core.hooksPath git_hooks
# Double check that the files are executable
tree git_hooks/
git_hooks/
├── pre-commit
├── pre-push
└── README.md
```
