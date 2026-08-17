# 🚀 GitHub Profile Analyzer

An interactive and modern **GitHub Profile Analyzer & Comparison Tool** built with **Express**, **Chart.js**, and a sleek **Neumorphic (Skeuomorphic) UI**. Analyze any developer's GitHub activity, repository metrics, language breakdowns, and compare profiles side-by-side.

---

## ✨ Features

- 👤 **Developer Profile Analytics**:
  - Avatar, Bio, Social links, Join date & GitHub experience.
  - 5-metric dashboard: Public Repos, Total Stars, Total Forks, Followers, Following.
  - Calculated highlights: Average stars per repository and top language.
- 📊 **Interactive Data Visualizations**:
  - **Bar Chart**: Top repositories sorted by star count with interactive tooltips.
  - **Doughnut Chart**: Programming language distribution across all repositories.
  - **Language Multi-Progress Bar**: Visual percentage breakdown of languages.
- ⚡ **Recent Activity Feed**:
  - Live timeline of commits pushed, repositories starred, branches created, and issues opened.
- 📂 **Repository Explorer**:
  - Real-time instant search filter by repository name or description.
  - Filter by programming language.
  - Sort by **Most Stars**, **Most Forks**, **Recently Updated**, or **Alphabetical**.
- ⚔️ **Head-to-Head Developer Comparison**:
  - Compare any two GitHub profiles side-by-side.
  - Comparative breakdown table with winner 🏆 badges.
  - Side-by-side comparison multi-bar chart.
- 🏷️ **Export & Badges**:
  - Generate GitHub Profile `README.md` Markdown badges with one click.
  - Export complete developer analysis as `.json`.
- 🎨 **Neumorphic Design System**:
  - Tactile 3D cards, inset input fields, and pressed button animations.
  - Fully responsive on mobile, tablet, and desktop screens.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Axios, Dotenv
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Neumorphism / Custom Tokens)
- **Charts & Data**: Chart.js v4.4
- **API**: GitHub REST API v3

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/apurbahalderwork/GitHub-Profile-Analyzer.git
cd GitHub-Profile-Analyzer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables (Optional)
Copy the example `.env` file:
```bash
cp .env.example .env
```
*(Optional)* Add a GitHub Personal Access Token to increase the API rate limit from 60 to 5,000 requests/hour:
```env
GITHUB_TOKEN=ghp_YourGitHubTokenHere
```

### 4. Run the Application
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📁 Project Structure

```
├── public/
│   ├── index.html      # Main application markup
│   ├── style.css       # Neumorphic design system & styling
│   └── script.js       # Chart rendering, API calls & state management
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules (protects .env & node_modules)
├── LICENSE             # MIT License
├── package.json        # Project metadata & dependencies
├── README.md           # Documentation
└── server.js           # Express server & GitHub API proxy
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
