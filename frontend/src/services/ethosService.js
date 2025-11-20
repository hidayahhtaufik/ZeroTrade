/**
 * Ethos Credibility Service
 * Integrates with Ethos API v1 for user reputation scores
 */

const ETHOS_API_URL = import.meta.env.VITE_ETHOS_API_URL || 'https://api.ethos.network/api/v1';

/**
 * Get credibility score for a user by address
 * @param {string} address - Ethereum address
 * @returns {Promise<Object>} Score data
 */
export async function getEthosScore(address) {
  if (!address) {
    return getDefaultScore();
  }

  try {
    const userkey = `address:${address}`;
    const response = await fetch(`${ETHOS_API_URL}/score/${userkey}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // User not found in Ethos - return default neutral score
        return getDefaultScore();
      }
      throw new Error(`Ethos API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.ok && data.data) {
      return {
        score: data.data.score,
        level: getScoreLevel(data.data.score),
        elements: data.data.elements,
        hasScore: true
      };
    }

    return getDefaultScore();
  } catch (error) {
    console.warn('Failed to fetch Ethos score:', error);
    return getDefaultScore();
  }
}

/**
 * Get score history for a user
 * @param {string} address - Ethereum address
 * @param {string} duration - Duration string (e.g., "30d", "90d")
 * @returns {Promise<Object>} Score history
 */
export async function getEthosScoreHistory(address, duration = "30d") {
  if (!address) {
    return { values: [], total: 0 };
  }

  try {
    const userkey = `address:${address}`;
    const response = await fetch(
      `${ETHOS_API_URL}/score/${userkey}/history?duration=${duration}&limit=10`
    );
    
    if (!response.ok) {
      return { values: [], total: 0 };
    }

    const data = await response.json();
    
    if (data.ok && data.data) {
      return data.data;
    }

    return { values: [], total: 0 };
  } catch (error) {
    console.warn('Failed to fetch Ethos score history:', error);
    return { values: [], total: 0 };
  }
}

/**
 * Determine score level based on score value
 * Untrusted: 0-799
 * Questionable: 800-1199
 * Neutral: 1200-1599
 * Reputable: 1600-1999
 * Exemplary: 2000-2800
 */
export function getScoreLevel(score) {
  if (score < 800) return { name: 'Untrusted', color: '#ef4444', emoji: '⚠️' };
  if (score < 1200) return { name: 'Questionable', color: '#f59e0b', emoji: '⚡' };
  if (score < 1600) return { name: 'Neutral', color: '#6b7280', emoji: '➖' };
  if (score < 2000) return { name: 'Reputable', color: '#10b981', emoji: '✅' };
  return { name: 'Exemplary', color: '#8b5cf6', emoji: '⭐' };
}

/**
 * Get default score for users not in Ethos system
 */
function getDefaultScore() {
  return {
    score: 1200,
    level: getScoreLevel(1200),
    elements: null,
    hasScore: false
  };
}

/**
 * Format score for display
 */
export function formatScore(score) {
  if (!score && score !== 0) return 'N/A';
  return score.toLocaleString();
}

/**
 * Get color for score visualization
 */
export function getScoreColor(score) {
  const level = getScoreLevel(score);
  return level.color;
}

/**
 * Get progress percentage (0-100) for score bar
 * Max score is 2800
 */
export function getScoreProgress(score) {
  const maxScore = 2800;
  return Math.min((score / maxScore) * 100, 100);
}
