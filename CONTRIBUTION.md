# Contributing to ClaimCraft

Welcome to the ClaimCraft project! To ensure smooth collaboration and prevent code conflicts, please follow the guidelines outlined below.

## Core Team (Authors)
The following members are the core authors of this project:
* Vitthal Humbe
* Avinash Pawar
* Dhruv Vaswani
* Akshit Agrawal

## Branching Strategy
To keep our development environment organized, **do not commit directly to the main branch**. Instead, you must create and work exclusively on a branch named after yourself. 

To create and switch to your personal branch, run the following command in your terminal:
`git checkout -b <your-name>`

*(Example: `git checkout -b vitthal`)*

## Critical Rule: No Force Pushing
**Under no circumstances should you force push to the repository.** 

You are strictly prohibited from running any Git command that contains the `--force` or `-f` flag. Force pushing overwrites the shared repository history, which can permanently delete your teammates' work and break the remote codebase. 

## Recommended Workflow
1. Always pull the latest changes before starting your work: `git pull origin main`
2. Switch to your personal branch: `git checkout <your-name>`
3. Make your code changes and commit them: `git commit -m "Description of your changes"`
4. Push your branch safely to the remote repository: `git push origin <your-name>`
5. Open a Pull Request (PR) to merge your work into the main branch.