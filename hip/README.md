# HertzBeat Improvement Proposal (HIP)

## What is a HIP?

The HIP is a "HertzBeat Improvement Proposal" and it's the mechanism used to propose changes to the Apache HertzBeat codebases.

The changes might be in terms of new features, large code refactoring, changes to APIs.

In practical terms, the HIP defines a process in which developers can submit a design doc, receive feedback and get the "go ahead" to execute.

### What is the goal of a HIP?

There are several goals for the HIP process:

1. Ensure community technical discussion of major changes to the Apache HertzBeat codebase.

2. Provide clear and thorough design documentation of the proposed changes. Make sure every HertzBeat developer will have enough context to effectively perform a code review of the Pull Requests.

3. Use the HIP document to serve as the baseline on which to create the documentation for the new feature.

4. Have greater scrutiny to changes are affecting the public APIs (as defined below) to reduce chances of introducing breaking changes or APIs that are not expressing an ideal semantic.

**It is not a goal for HIP to add undue process or slow-down the development.**

### When is a HIP required?

* Major new feature for HertzBeat (Example: support metrics push gateway, support logs monitoring)
* Major change to the wire protocol APIs
* Large code change that will touch multiple components

### When is a HIP *not* required?

* Bug-fixes
* Simple enhancements 
* Simple code refactor, improve
* Small new feature, like support new monitoring type
* Small documentation changes
* Small website changes

### Who can create a HIP?

Any person willing to contribute to the Apache HertzBeat project is welcome to create a HIP.

## How does the HIP process work?

A HIP proposal can be in these states:
1. **DRAFT**: (Optional) This might be used for contributors to collaborate and to seek feedback on an incomplete version of the proposal.

2. **DISCUSSION**: The proposal has been submitted to the community for feedback and approval.

3. **ACCEPTED**: The proposal has been accepted by the HertzBeat project.

4. **REJECTED**: The proposal has not been accepted by the HertzBeat project.

5. **IMPLEMENTED**: The implementation of the proposed changes have been completed and everything has been merged.

6. **RELEASED**: The proposed changes have been included in an official
   Apache HertzBeat release.


The process works in the following way:

1. Fork https://github.com/apache/hertzbeat repository (Using the fork button on GitHub).
2. Clone the repository, and on it, copy the file `hip/TEMPLATE.md` and name it `hip-xxx.md`. The number `xxx` should be the next sequential number after the last contributed HIP. You view the list of contributed HIPs (at any status) as a list of Pull Requests having a "HIP" label. Use the link [here](https://github.com/apache/hertzbeat/pulls?q=is%3Apr+label%3Ahip+) as shortcut.
3. Write the proposal following the section outlined by the template and the explanation for each section in the comment it contains (you can delete the comment once done).
    * If you need diagrams, avoid attaching large files. You can use [MermaidJS](https://mermaid.js.org/) as simple language to describe many types of diagrams.
4. Create GitHub Pull request (PR). The PR title should be `[improve]\[HIP\] HIP-xxx: {title}`, where the `xxx` match the number given in previous step (file-name). Replace `{title}` with a short title to your proposal.
   *Validate* again that your number does not collide, by step (2) numbering check.
5. The author(s) will email the dev@hertzbeat.apache.org mailing list to kick off a discussion, using subject prefix `[DISCUSS] HIP-xxx: {HIP TITLE}`. The discussion will happen in broader context either on the mailing list or as general comments on the PR. Many of the discussion items will be on particular aspect of the proposal, hence they should be as comments in the PR to specific lines in the proposal file.
6. Update file with a link to the discussion on the mailing. You can obtain it from [Apache Pony Mail](https://lists.apache.org/list.html?dev@hertzbeat.apache.org).
7. Based on the discussion and feedback, some changes might be applied by authors to the text of the proposal. They will be applied as extra commits, making it easier to track the changes.
8. Once some consensus is reached, there will be a vote to formally approve the proposal. The vote will be held on the dev@hertzbeat.apache.org mailing list, by
   sending a message using subject `[VOTE] HIP-xxx: {HIP TITLE}`. Make sure to include a link to the HIP PR in the body of the message.
   Make sure to update the HIP with a link to the vote. You can obtain it from [Apache Pony Mail](https://lists.apache.org/list.html?dev@hertzbeat.apache.org).
   Everyone is welcome to vote on the proposal, though only the vote of the PMC members will be considered binding.
   It is required to have a lazy majority of at least 3 binding +1s votes.
   The vote should stay open for at least 48 hours.
9. When the vote is closed, if the outcome is positive, ask a PMC member (using voting thread on mailing list) to merge the PR.
10. If the outcome is negative, please close the PR (with a small comment that the close is a result of a vote).

All the future implementation Pull Requests that will be created, should always reference the HIP-XXX in the commit log message and the PR title.
It is advised to create a master GitHub issue to formulate the execution plan and track its progress.



## List of HIPs

### List of HIPs
1. You can view all HIPs as the list of Pull Requests having title starting with `[improve]\[HIP\] HIP-`. Here is the [link](https://github.com/apache/hertzbeat/pulls?q=is%3Apr+title%3A%22%5BHIP%5D%5Bdesign%5D+hip-%22) for it.
    - Merged PR means the HIP was accepted.
    - Closed PR means the HIP was rejected.
    - Open PR means the HIP was submitted and is in the process of discussion.
2. You can also take a look at the file in the `hip` folder. Each one is an approved HIP.
