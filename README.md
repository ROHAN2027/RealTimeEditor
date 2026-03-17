# RealTimeEditor

A real-time collaborative text editor that lets multiple users edit documents simultaneously.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the Repository](#clone-the-repository)
  - [Initialize a Fresh Local Copy](#initialize-a-fresh-local-copy)
- [Local Development](#local-development)
- [Contributing](#contributing)
  - [How to Push Changes](#how-to-push-changes)
- [License](#license)

---

## About the Project

**RealTimeEditor** is a collaborative, real-time text-editing application. Multiple users can open the same document and see each other's changes instantly, making it ideal for pair programming, note-taking, or any situation where synchronous collaboration is needed.

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/downloads) (v2.x or newer)
- [Node.js](https://nodejs.org/) (v18 or newer)
- A GitHub account (to push changes or open pull requests)

### Clone the Repository

If you want to work with the existing repository, simply clone it:

```bash
git clone https://github.com/ROHAN2027/RealTimeEditor.git
cd RealTimeEditor
```

### Initialize a Fresh Local Copy

If you want to start from scratch in a new local directory and connect it to this remote repository, follow these steps:

```bash
# 1. Create and enter a new directory
mkdir RealTimeEditor
cd RealTimeEditor

# 2. Initialize a new Git repository
git init

# 3. Add the remote origin pointing to GitHub
git remote add origin https://github.com/ROHAN2027/RealTimeEditor.git

# 4. Pull the existing content from the main branch
git pull origin main

# 5. (Optional) Create a new branch for your work
git checkout -b my-feature-branch
```

---

## Local Development

```bash
# Install dependencies (adjust command for your package manager)
npm install

# Start the development server
npm run dev
```

Open your browser and navigate to `http://localhost:3000` (default port; check `.env` or your config file if you changed it).

---

## Contributing

Contributions are welcome! Please follow the steps below.

### How to Push Changes

```bash
# 1. Make sure you are on a feature branch (never commit directly to main)
git checkout -b your-feature-name

# 2. Stage your changes
git add .

# 3. Commit with a meaningful message
git commit -m "feat: describe your change here"

# 4. Push the branch to GitHub
git push origin your-feature-name
```

5. Open a **Pull Request** on GitHub from your branch into `main`.

> **Tip:** If this is your first push and the branch does not yet exist on GitHub, Git will
> prompt you to set the upstream. You can do so with:
> ```bash
> git push --set-upstream origin your-feature-name
> ```

---

## License

This project is licensed under the [MIT License](LICENSE).
