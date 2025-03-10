# Contributing to Cardano MCP Server

We love your input! We want to make contributing to the Cardano MCP Server as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [Github Flow](https://guides.github.com/introduction/flow/index.html)

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Continuous Integration/Continuous Delivery

We use GitHub Actions for CI/CD. When you submit a pull request, the following checks will automatically run:

1. **Quality Gates**:

   - ESLint checks for code quality issues
   - TypeScript type checking to ensure type safety
   - Prettier formatting verification

2. **Build and Test**:
   - Full TypeScript build
   - Unit and integration tests for all modules
   - Test coverage threshold enforcement (>90% line coverage)

All checks must pass before a pull request can be merged. If you encounter any issues with the CI/CD pipeline, please reach out to the maintainers.

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's [issue tracker](https://github.com/Jimmyh-world/Cardano_MCP/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/Jimmyh-world/Cardano_MCP/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Use a Consistent Coding Style

- Use TypeScript for all new code
- 2 spaces for indentation rather than tabs
- You can try running `npm run lint` for style unification

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
