// Global Chart Instances
let starsChartInstance = null;
let languagesChartInstance = null;
let compareChartInstance = null;

// Cached data for local filtering
let currentRepos = [];
let currentProfileData = null;

// Language color mapping
const LANGUAGE_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  Vue: '#41b883',
  Other: '#64748b'
};

// Enter key listeners
document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') getProfile();
    });
  }

  const compUser1 = document.getElementById('compareUser1');
  const compUser2 = document.getElementById('compareUser2');
  if (compUser1) compUser1.addEventListener('keypress', (e) => { if (e.key === 'Enter') compareDevelopers(); });
  if (compUser2) compUser2.addEventListener('keypress', (e) => { if (e.key === 'Enter') compareDevelopers(); });
});

// Mode Switcher (Single vs Compare)
function switchMode(mode) {
  const tabSingle = document.getElementById('tabSingle');
  const tabCompare = document.getElementById('tabCompare');
  const singleSearch = document.getElementById('singleSearchSection');
  const compareSearch = document.getElementById('compareSearchSection');
  const singleContainer = document.getElementById('singleUserContainer');
  const compareContainer = document.getElementById('compareContainer');
  const statusMsg = document.getElementById('statusMessage');

  statusMsg.style.display = 'none';

  if (mode === 'single') {
    tabSingle.classList.add('active');
    tabCompare.classList.remove('active');
    singleSearch.style.display = 'flex';
    compareSearch.style.display = 'none';
    singleContainer.style.display = 'block';
    compareContainer.style.display = 'none';
  } else {
    tabSingle.classList.remove('active');
    tabCompare.classList.add('active');
    singleSearch.style.display = 'none';
    compareSearch.style.display = 'flex';
    singleContainer.style.display = 'none';
    compareContainer.style.display = 'flex';
  }
}

// Quick search tag helper
function searchUser(username) {
  switchMode('single');
  const input = document.getElementById('username');
  input.value = username;
  getProfile();
}

// ================= SINGLE PROFILE ANALYSIS =================
async function getProfile() {
  const usernameInput = document.getElementById('username');
  const username = usernameInput.value.trim();
  const statusMsg = document.getElementById('statusMessage');
  const profileDiv = document.getElementById('profile');
  const chartsWrapper = document.getElementById('chartsWrapper');
  const activityCard = document.getElementById('activityCard');
  const reposSection = document.getElementById('reposSection');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!username) {
    showError('Please enter a GitHub username');
    return;
  }

  // Loading state
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-block';
  analyzeBtn.disabled = true;
  statusMsg.style.display = 'none';

  try {
    const res = await fetch(`/api/user/${encodeURIComponent(username)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Failed to fetch user profile');
      return;
    }

    currentProfileData = data;
    currentRepos = data.repos || [];

    // 1. Render Profile Header & Highlights
    renderProfileHeader(data);
    profileDiv.style.display = 'block';

    // 2. Render Charts
    renderCharts(data);

    // 3. Render Activity Feed
    renderActivities(data.activities || []);

    // 4. Populate Language Dropdown & Render Repositories
    populateLanguageFilter(currentRepos);
    filterRepositories();

  } catch (err) {
    showError('Unable to connect to server. Please check your network or server status.');
  } finally {
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    analyzeBtn.disabled = false;
  }
}

function showError(message) {
  const statusMsg = document.getElementById('statusMessage');
  const profileDiv = document.getElementById('profile');
  const chartsWrapper = document.getElementById('chartsWrapper');
  const activityCard = document.getElementById('activityCard');
  const reposSection = document.getElementById('reposSection');
  const compareContainer = document.getElementById('compareContainer');

  statusMsg.className = 'status-msg error';
  statusMsg.innerHTML = `⚠️ ${escapeHtml(message)}`;
  statusMsg.style.display = 'flex';
  profileDiv.style.display = 'none';
  chartsWrapper.style.display = 'none';
  activityCard.style.display = 'none';
  reposSection.style.display = 'none';
  compareContainer.style.display = 'none';
}

function renderProfileHeader(data) {
  const profileDiv = document.getElementById('profile');
  
  const createdDate = data.created_at ? new Date(data.created_at) : null;
  const joinDate = createdDate 
    ? createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  // Calculate Account Age
  let accountAge = '';
  if (createdDate) {
    const years = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24 * 365.25));
    accountAge = years > 0 ? `${years} yr${years > 1 ? 's' : ''} on GitHub` : 'Joined this year';
  }

  // Find top language
  let topLanguage = 'None';
  let maxCount = 0;
  for (const [lang, count] of Object.entries(data.languages || {})) {
    if (count > maxCount) {
      maxCount = count;
      topLanguage = lang;
    }
  }

  const locationHtml = data.location ? `<span class="tag-item">📍 ${escapeHtml(data.location)}</span>` : '';
  const companyHtml = data.company ? `<span class="tag-item">🏢 ${escapeHtml(data.company)}</span>` : '';
  const joinHtml = joinDate ? `<span class="tag-item">📅 Joined ${joinDate}</span>` : '';
  
  let blogUrl = data.blog ? data.blog.trim() : '';
  if (blogUrl && !blogUrl.startsWith('http://') && !blogUrl.startsWith('https://')) {
    blogUrl = 'https://' + blogUrl;
  }
  const blogHtml = data.blog ? `<span class="tag-item">🔗 <a href="${escapeHtml(blogUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.blog)}</a></span>` : '';
  const twitterHtml = data.twitter_username ? `<span class="tag-item">🐦 <a href="https://twitter.com/${escapeHtml(data.twitter_username)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(data.twitter_username)}</a></span>` : '';
  const bioHtml = data.bio ? `<p class="profile-bio">${escapeHtml(data.bio)}</p>` : '<p class="profile-bio" style="color: #64748b; font-style: italic;">No bio provided</p>';

  // Language multi-progress bar
  const langEntries = Object.entries(data.language_percentages || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let langBarHtml = '';
  let langLegendHtml = '';

  if (langEntries.length > 0) {
    const segments = langEntries.map(([lang, pct]) => {
      const color = LANGUAGE_COLORS[lang] || '#3b82f6';
      return `<div class="lang-segment" style="width: ${pct}%; background-color: ${color};" title="${escapeHtml(lang)}: ${pct}%"></div>`;
    }).join('');

    const legends = langEntries.map(([lang, pct]) => {
      const color = LANGUAGE_COLORS[lang] || '#3b82f6';
      return `
        <span class="legend-item">
          <span class="legend-dot" style="background-color: ${color};"></span>
          <span>${escapeHtml(lang)} <strong>${pct}%</strong></span>
        </span>
      `;
    }).join('');

    langBarHtml = `
      <div class="lang-progress-container">
        <div class="lang-progress-bar">${segments}</div>
        <div class="lang-legend">${legends}</div>
      </div>
    `;
  }

  profileDiv.innerHTML = `
    <div class="profile-header">
      <div class="avatar-wrapper">
        <img class="avatar-img" src="${escapeHtml(data.avatar_url)}" alt="${escapeHtml(data.name || data.login)}" />
      </div>
      <div class="profile-meta">
        <div class="profile-title-row">
          <div class="profile-names">
            <h2>${escapeHtml(data.name || data.login)}</h2>
            <a class="profile-login" href="${escapeHtml(data.html_url)}" target="_blank" rel="noopener noreferrer">@${escapeHtml(data.login)} ↗</a>
          </div>
          <div class="action-buttons">
            <button class="action-btn" onclick="openBadgeModal()">🏷️ Get Badge</button>
            <button class="action-btn" onclick="exportDataJson()">💾 JSON</button>
          </div>
        </div>
        ${bioHtml}
        <div class="profile-tags">
          ${locationHtml}
          ${companyHtml}
          ${twitterHtml}
          ${blogHtml}
          ${joinHtml}
        </div>
      </div>
    </div>

    <!-- Highlights Row -->
    <div class="highlights-row">
      <div class="highlight-badge">⭐ Avg Stars/Repo: <strong>${data.avg_stars_per_repo}</strong></div>
      <div class="highlight-badge">💻 Top Language: <strong>${escapeHtml(topLanguage)}</strong></div>
      <div class="highlight-badge">⏳ Experience: <strong>${accountAge}</strong></div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Public Repos</div>
        <div class="stat-value" style="color: var(--accent-repo);">${data.public_repos ?? 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Stars</div>
        <div class="stat-value" style="color: var(--accent-star);">⭐ ${data.stars ?? 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Forks</div>
        <div class="stat-value" style="color: var(--accent-fork);">🍴 ${data.forks ?? 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Followers</div>
        <div class="stat-value" style="color: var(--accent-followers);">${data.followers ?? 0}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Following</div>
        <div class="stat-value" style="color: var(--accent-following);">${data.following ?? 0}</div>
      </div>
    </div>

    ${langBarHtml}
  `;
}

function renderCharts(data) {
  const chartsWrapper = document.getElementById('chartsWrapper');
  const repos = data.repos || [];
  const languages = data.languages || {};
  const hasRepos = repos.length > 0;
  const hasLanguages = Object.keys(languages).length > 0;

  if (!hasRepos && !hasLanguages) {
    chartsWrapper.style.display = 'none';
    return;
  }

  chartsWrapper.style.display = 'grid';
  document.getElementById('repoCountBadge').textContent = `${repos.length} Repos`;

  // 1. Stars Chart
  const topRepos = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 10);
  const repoNames = topRepos.map(r => r.name);
  const repoStars = topRepos.map(r => r.stars);

  const starsCanvas = document.getElementById('starsChart');
  if (starsCanvas) {
    const ctx = starsCanvas.getContext('2d');
    if (starsChartInstance) starsChartInstance.destroy();

    starsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: repoNames,
        datasets: [{
          label: 'Stars',
          data: repoStars,
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(96, 165, 250, 0.95)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#93c5fd',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => `⭐ Stars: ${context.parsed.y}`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
              maxRotation: 40,
              minRotation: 20
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#94a3b8',
              font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
              precision: 0
            },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          }
        }
      }
    });
  }

  // 2. Languages Chart
  const langCanvas = document.getElementById('languagesChart');
  if (langCanvas) {
    const langCtx = langCanvas.getContext('2d');
    if (languagesChartInstance) languagesChartInstance.destroy();

    const langLabels = Object.keys(languages);
    const langValues = Object.values(languages);
    const langColors = langLabels.map(l => LANGUAGE_COLORS[l] || '#60a5fa');

    if (langLabels.length > 0) {
      languagesChartInstance = new Chart(langCtx, {
        type: 'doughnut',
        data: {
          labels: langLabels,
          datasets: [{
            data: langValues,
            backgroundColor: langColors,
            borderColor: '#1e293b',
            borderWidth: 2,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#cbd5e1',
                font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
                padding: 12,
                boxWidth: 12
              }
            },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f8fafc',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: (context) => ` ${context.label}: ${context.parsed} repos`
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }
}

function renderActivities(activities) {
  const activityCard = document.getElementById('activityCard');
  const activityList = document.getElementById('activityList');

  if (!activities || activities.length === 0) {
    activityCard.style.display = 'none';
    return;
  }

  activityCard.style.display = 'block';
  activityList.innerHTML = activities.map(act => {
    let icon = '⚡';
    if (act.type === 'PushEvent') icon = '🚀';
    else if (act.type === 'WatchEvent') icon = '⭐';
    else if (act.type === 'CreateEvent') icon = '🌿';
    else if (act.type === 'ForkEvent') icon = '🍴';
    else if (act.type === 'IssuesEvent') icon = '🎯';

    const timeAgo = formatTimeAgo(act.created_at);

    return `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-content">
          <div class="activity-title">
            ${escapeHtml(act.summary)} on <a class="activity-repo" href="${escapeHtml(act.repo_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(act.repo)}</a>
          </div>
          ${act.details ? `<div class="activity-details">"${escapeHtml(act.details)}"</div>` : ''}
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');
}

function populateLanguageFilter(repos) {
  const select = document.getElementById('repoLanguageSelect');
  const languages = new Set();
  repos.forEach(r => { if (r.language && r.language !== 'Other') languages.add(r.language); });

  select.innerHTML = '<option value="ALL">All Languages</option>' + 
    Array.from(languages).sort().map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
}

function filterRepositories() {
  const search = (document.getElementById('repoSearchInput').value || '').toLowerCase().trim();
  const selectedLang = document.getElementById('repoLanguageSelect').value;
  const sortBy = document.getElementById('repoSortSelect').value;
  const reposSection = document.getElementById('reposSection');
  const reposGrid = document.getElementById('reposGrid');

  let filtered = currentRepos.filter(repo => {
    const matchesSearch = !search || repo.name.toLowerCase().includes(search) || (repo.description && repo.description.toLowerCase().includes(search));
    const matchesLang = selectedLang === 'ALL' || repo.language === selectedLang;
    return matchesSearch && matchesLang;
  });

  // Sorting
  if (sortBy === 'stars') {
    filtered.sort((a, b) => b.stars - a.stars);
  } else if (sortBy === 'forks') {
    filtered.sort((a, b) => b.forks - a.forks);
  } else if (sortBy === 'updated') {
    filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (filtered.length === 0) {
    reposSection.style.display = 'flex';
    reposGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">No repositories match your filter.</p>`;
    return;
  }

  reposSection.style.display = 'flex';
  reposGrid.innerHTML = filtered.map(repo => {
    const langColor = LANGUAGE_COLORS[repo.language] || '#64748b';
    const langDot = repo.language && repo.language !== 'Other' 
      ? `<span class="repo-lang"><span class="lang-dot" style="background-color: ${langColor};"></span>${escapeHtml(repo.language)}</span>`
      : `<span class="repo-lang" style="color: #64748b;">No language</span>`;

    const updated = formatTimeAgo(repo.updated_at);

    return `
      <div class="repo-card">
        <div class="repo-top">
          <a class="repo-title" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(repo.name)}
          </a>
          <p class="repo-desc">${escapeHtml(repo.description)}</p>
        </div>
        <div class="repo-footer">
          ${langDot}
          <div class="repo-metrics">
            <span class="repo-metric-item" title="Stars">⭐ ${repo.stars}</span>
            <span class="repo-metric-item" title="Forks">🍴 ${repo.forks}</span>
            <span class="repo-metric-item" title="Updated" style="font-size: 0.76rem; color: #64748b;">${updated}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ================= COMPARE MODE =================
async function compareDevelopers() {
  const user1 = (document.getElementById('compareUser1').value || '').trim();
  const user2 = (document.getElementById('compareUser2').value || '').trim();
  const statusMsg = document.getElementById('statusMessage');
  const compareContainer = document.getElementById('compareContainer');
  const btnText = document.getElementById('compareBtnText');
  const btnSpinner = document.getElementById('compareBtnSpinner');
  const compareBtn = document.getElementById('compareBtn');

  if (!user1 || !user2) {
    showError('Please enter both usernames to compare');
    return;
  }

  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-block';
  compareBtn.disabled = true;
  statusMsg.style.display = 'none';

  try {
    const res = await fetch(`/api/compare/${encodeURIComponent(user1)}/${encodeURIComponent(user2)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || 'Failed to compare developers');
      return;
    }

    renderComparison(data.user1, data.user2);
    compareContainer.style.display = 'flex';

  } catch (err) {
    showError('Failed to compare developers. Please check server connection.');
  } finally {
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    compareBtn.disabled = false;
  }
}

function renderComparison(u1, u2) {
  document.getElementById('compHeadUser1').textContent = u1.name || u1.login;
  document.getElementById('compHeadUser2').textContent = u2.name || u2.login;

  // Comparison user cards
  const grid = document.getElementById('compareCardsGrid');
  grid.innerHTML = `
    <div class="compare-user-card">
      <img class="compare-avatar" src="${escapeHtml(u1.avatar_url)}" alt="${escapeHtml(u1.login)}" />
      <h3>${escapeHtml(u1.name || u1.login)}</h3>
      <p style="color: #94a3b8; font-size: 0.9rem;">@${escapeHtml(u1.login)}</p>
    </div>
    <div class="compare-user-card">
      <img class="compare-avatar" src="${escapeHtml(u2.avatar_url)}" alt="${escapeHtml(u2.login)}" />
      <h3>${escapeHtml(u2.name || u2.login)}</h3>
      <p style="color: #94a3b8; font-size: 0.9rem;">@${escapeHtml(u2.login)}</p>
    </div>
  `;

  // Comparison Table rows
  const metrics = [
    { label: 'Total Stars', v1: u1.stars, v2: u2.stars, format: v => `⭐ ${v}` },
    { label: 'Public Repositories', v1: u1.public_repos, v2: u2.public_repos, format: v => `${v}` },
    { label: 'Followers', v1: u1.followers, v2: u2.followers, format: v => `${v}` },
    { label: 'Following', v1: u1.following, v2: u2.following, format: v => `${v}` },
    { label: 'Total Forks', v1: u1.forks, v2: u2.forks, format: v => `🍴 ${v}` },
    { label: 'Avg Stars/Repo', v1: Number(u1.avg_stars_per_repo), v2: Number(u2.avg_stars_per_repo), format: v => `${v}` }
  ];

  const tbody = document.getElementById('compareTableBody');
  tbody.innerHTML = metrics.map(m => {
    const isU1Win = m.v1 > m.v2;
    const isU2Win = m.v2 > m.v1;
    return `
      <tr>
        <td class="${isU1Win ? 'winner-cell' : ''}">${m.format(m.v1)} ${isU1Win ? '🏆' : ''}</td>
        <td style="color: #cbd5e1; font-weight: 600;">${m.label}</td>
        <td class="${isU2Win ? 'winner-cell' : ''}">${m.format(m.v2)} ${isU2Win ? '🏆' : ''}</td>
      </tr>
    `;
  }).join('');

  // Comparison Chart
  const ctx = document.getElementById('compareChart').getContext('2d');
  if (compareChartInstance) compareChartInstance.destroy();

  compareChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Stars', 'Public Repos', 'Followers', 'Forks'],
      datasets: [
        {
          label: u1.name || u1.login,
          data: [u1.stars, u1.public_repos, u1.followers, u1.forks],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: u2.name || u2.login,
          data: [u2.stars, u2.public_repos, u2.followers, u2.forks],
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: '#a855f7',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#f8fafc', font: { family: "'Plus Jakarta Sans', sans-serif" } }
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.06)' }, beginAtZero: true }
      }
    }
  });
}

// ================= MODAL & EXPORT HELPERS =================
function openBadgeModal() {
  if (!currentProfileData) return;
  const username = currentProfileData.login;
  const markdown = `[![GitHub Profile](https://img.shields.io/badge/GitHub-${username}-blue?style=for-the-badge&logo=github)](https://github.com/${username})\n[![Total Stars](https://img.shields.io/badge/Stars-${currentProfileData.stars}-yellow?style=for-the-badge&logo=star)](https://github.com/${username}?tab=repositories)\n[![Public Repos](https://img.shields.io/badge/Repos-${currentProfileData.public_repos}-cyan?style=for-the-badge)](https://github.com/${username})`;
  
  document.getElementById('badgeMarkdownText').value = markdown;
  document.getElementById('badgeModal').style.display = 'flex';
}

function closeBadgeModal(event) {
  document.getElementById('badgeModal').style.display = 'none';
}

function copyBadgeMarkdown() {
  const textarea = document.getElementById('badgeMarkdownText');
  textarea.select();
  navigator.clipboard.writeText(textarea.value);
  alert('Badge Markdown copied to clipboard!');
}

function exportDataJson() {
  if (!currentProfileData) return;
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentProfileData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${currentProfileData.login}-github-analysis.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
