const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Helper function to build GitHub request headers
function getHeaders(useToken = true) {
  const token = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.trim() : '';
  const headers = {
    'User-Agent': 'GitHub-Profile-Analyzer',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (useToken && token && !token.includes('your_github_token')) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// GitHub API Fetcher with automatic fallback on 401
async function fetchGithub(url) {
  try {
    return await axios.get(url, { headers: getHeaders(true) });
  } catch (err) {
    if (err.response && err.response.status === 401 && process.env.GITHUB_TOKEN) {
      console.warn('⚠️ GITHUB_TOKEN in .env is invalid or expired (401). Falling back to unauthenticated request.');
      return await axios.get(url, { headers: getHeaders(false) });
    }
    throw err;
  }
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper to fetch complete profile info for a user
async function getUserFullData(username) {
  const cleanUsername = username.trim();
  
  const [userRes, repoRes, eventsRes, orgsRes] = await Promise.all([
    fetchGithub(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`),
    fetchGithub(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?per_page=100&sort=pushed`),
    fetchGithub(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/events/public?per_page=30`).catch(() => ({ data: [] })),
    fetchGithub(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/orgs`).catch(() => ({ data: [] }))
  ]);

  const reposData = repoRes.data || [];
  
  // Format repositories
  const repos = reposData.map(repo => ({
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description || 'No description provided',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    watchers: repo.watchers_count || 0,
    language: repo.language || 'Other',
    html_url: repo.html_url,
    updated_at: repo.pushed_at || repo.updated_at,
    created_at: repo.created_at,
    fork: repo.fork
  }));

  // Aggregated stats
  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
  const totalForks = repos.reduce((acc, r) => acc + r.forks, 0);
  const totalWatchers = repos.reduce((acc, r) => acc + r.watchers, 0);

  // Language counts
  const languageCounts = {};
  repos.forEach(repo => {
    if (repo.language && repo.language !== 'Other') {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  // Calculate percentages
  const totalWithLanguage = Object.values(languageCounts).reduce((a, b) => a + b, 0);
  const languagePercentages = {};
  for (const [lang, count] of Object.entries(languageCounts)) {
    languagePercentages[lang] = totalWithLanguage > 0 ? Number(((count / totalWithLanguage) * 100).toFixed(1)) : 0;
  }

  // Format events/activities
  const activities = (eventsRes.data || []).slice(0, 15).map(ev => {
    let summary = ev.type.replace('Event', '');
    let details = '';
    if (ev.type === 'PushEvent') {
      const commitCount = ev.payload?.commits?.length || 1;
      summary = `Pushed ${commitCount} commit${commitCount > 1 ? 's' : ''}`;
      details = ev.payload?.commits?.[0]?.message || '';
    } else if (ev.type === 'CreateEvent') {
      summary = `Created ${ev.payload?.ref_type || 'repository'}`;
    } else if (ev.type === 'WatchEvent') {
      summary = 'Starred repository';
    } else if (ev.type === 'ForkEvent') {
      summary = 'Forked repository';
    } else if (ev.type === 'IssuesEvent') {
      summary = `${ev.payload?.action || 'Opened'} issue`;
      details = ev.payload?.issue?.title || '';
    }

    return {
      type: ev.type,
      summary,
      details,
      repo: ev.repo?.name || '',
      repo_url: ev.repo?.name ? `https://github.com/${ev.repo.name}` : '#',
      created_at: ev.created_at
    };
  });

  // Format organizations
  const orgs = (orgsRes.data || []).map(org => ({
    login: org.login,
    avatar_url: org.avatar_url,
    description: org.description
  }));

  return {
    login: userRes.data.login,
    name: userRes.data.name || userRes.data.login,
    avatar_url: userRes.data.avatar_url,
    bio: userRes.data.bio,
    location: userRes.data.location,
    company: userRes.data.company,
    blog: userRes.data.blog,
    twitter_username: userRes.data.twitter_username,
    html_url: userRes.data.html_url,
    created_at: userRes.data.created_at,
    followers: userRes.data.followers || 0,
    following: userRes.data.following || 0,
    public_repos: userRes.data.public_repos || 0,
    public_gists: userRes.data.public_gists || 0,
    stars: totalStars,
    forks: totalForks,
    watchers: totalWatchers,
    avg_stars_per_repo: repos.length > 0 ? (totalStars / repos.length).toFixed(1) : 0,
    languages: languageCounts,
    language_percentages: languagePercentages,
    activities,
    orgs,
    repos
  };
}

// Single user API endpoint
app.get('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Please enter a valid GitHub username' });
    }
    const data = await getUserFullData(username);
    res.json(data);
  } catch (err) {
    if (err.response) {
      if (err.response.status === 404) {
        return res.status(404).json({ error: `User "${req.params.username}" not found on GitHub` });
      } else if (err.response.status === 403) {
        return res.status(403).json({ error: 'GitHub API rate limit exceeded. Please try again later or add a GITHUB_TOKEN.' });
      } else {
        return res.status(err.response.status).json({ error: err.response.data?.message || 'GitHub API error' });
      }
    }
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Compare two users API endpoint
app.get('/api/compare/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    if (!user1 || !user2) {
      return res.status(400).json({ error: 'Please provide both usernames for comparison' });
    }

    const [data1, data2] = await Promise.all([
      getUserFullData(user1),
      getUserFullData(user2)
    ]);

    res.json({
      user1: data1,
      user2: data2
    });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'One or both users not found on GitHub' });
    }
    res.status(500).json({ error: err.message || 'Comparison failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 GitHub Profile Analyzer running on http://localhost:${PORT}`);
});
