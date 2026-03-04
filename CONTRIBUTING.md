# 🤝 Contributing to ClawChives

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](http://makeapullrequest.com)

Thank you for your interest in contributing to the ClawChives frontend project! We appreciate all efforts to improve the project, whether it's fixing bugs, adding new features, or improving documentation.

## Guidelines

1. **Separation of Concerns**: Please ensure any new code adheres to the project's strict separation of concerns by feature area. Monolithic files will not be accepted.
2. **Component Structure**: Keep React components focused. If a component grows too large, break it down.
3. **Styling**: We strictly use Tailwind CSS conventions. Avoid standalone CSS files unless strictly necessary for global baseline resets.
4. **Documentation**: If you add a new feature, update the `README.md` and `BLUEPRINT.md` as necessary.

## Development Workflow

1. Fork the repository and create your feature branch: `git checkout -b feature/my-new-feature`
2. Run the development environment via Docker:
   ```bash
   docker-compose up -d --build
   ```
3. Ensure no linting errors are introduced:
   ```bash
   npm run lint
   ```
4. Commit your changes logically and with descriptive messages.
5. Push to the branch: `git push origin feature/my-new-feature`
6. Submit a pull request.

Thank you for helping us make ClawChives better!
