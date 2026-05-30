# 0005. Git repository rooted in the project folder

## Status
Accepted

## Context
On initial inspection, the Git repository was rooted at the user's **home directory**
(`C:\Users\<user>\.git`), with the project as a subfolder. This is unsafe: any `git add` could
stage personal files (Documents, Downloads, SSH keys, registry hives, OneDrive), and the working
tree was polluted with unrelated content. The remote `origin` was correct and contained only a
1-line `README.md`.

## Decision
Remove the stray home-level `.git`, and re-establish the repository **inside the project folder**
(`.../GitHub/dynamics-365-ccaas-audio-video-channel`) by cloning the remote to a temp location and
moving its `.git` into the project folder, preserving remote history.

## Consequences
- The repository is now correctly scoped; `git rev-parse --show-toplevel` returns the project folder.
- No risk of committing personal/home files.
- A `.gitignore` further protects secrets and build output.
- The previous misconfiguration is documented here to prevent recurrence.
