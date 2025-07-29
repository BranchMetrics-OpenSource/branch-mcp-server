# Contributing to the Branch MCP Server

First off, thank you for considering contributing! Your help is appreciated. This project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

## How Can I Contribute?

### Reporting Bugs

This project uses GitHub Issues to track bugs. Report a bug by [opening a new issue](https://github.com/${{ github.repository }}/issues/new). Please include a clear title and description, as much relevant information as possible, and a code sample or an executable test case demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

Suggest an enhancement by [opening a new issue](https://github.com/${{ github.repository }}/issues/new). Please provide a clear title and a detailed description of the proposed enhancement and its potential benefits.

### Pull Requests

We welcome pull requests for bug fixes and enhancements.

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, update the documentation.
4.  Ensure the test suite passes.
5.  Make sure your code lints.
6.  Issue that pull request!

## Development Setup

To get the project running locally, follow these steps:

1.  Clone the repository:
    ```sh
    git clone https://github.com/${{ github.repository }}.git
    cd branch-mcp-server
    ```

2.  Install the dependencies:
    ```sh
    npm install
    ```

## Linting

This project uses ESLint for code quality. To run the linter, use:

```sh
npm run lint
```

To automatically fix linting issues, run:

```sh
npm run lint:fix
```

We look forward to your contributions!
