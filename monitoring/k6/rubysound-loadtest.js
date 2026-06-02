import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL || "http://web:8000").replace(/\/$/, "");
const PUBLIC_QUERY = __ENV.PUBLIC_QUERY || "metallica";
const YEAR_GENRE = __ENV.YEAR_GENRE || "rock";
const TRENDING_LIMIT = Number(__ENV.TRENDING_LIMIT || 10);
const SEARCH_LIMIT = Number(__ENV.SEARCH_LIMIT || 12);
const STEADY_SLEEP = Number(__ENV.STEADY_SLEEP || 1);

export const options = {
  scenarios: {
    rubysound_baseline: {
      executor: "ramping-vus",
      stages: [
        { duration: "20s", target: 5 },
        { duration: "40s", target: 15 },
        { duration: "20s", target: 25 },
        { duration: "20s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.98"],
  },
};

function url(path) {
  return `${BASE_URL}${path}`;
}

function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      }
    : { Accept: "application/json" };
}

function getJson(path, params = {}) {
  return http.get(url(path), {
    tags: { endpoint: path },
    params,
  });
}

function postJson(path, body, params = {}) {
  return http.post(url(path), JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    tags: { endpoint: path },
    params,
  });
}

export function setup() {
  const username = __ENV.LOADTEST_USERNAME;
  const password = __ENV.LOADTEST_PASSWORD;

  if (!username || !password) {
    return { token: null };
  }

  const res = postJson("/api/auth/token/", { username, password });
  check(res, {
    "auth token obtained": (r) => r.status === 200 && !!r.json("access"),
  });

  return { token: res.json("access") || null };
}

export default function (data) {
  group("read-only endpoints", () => {
    const responses = http.batch([
      ["GET", url("/health/live"), null, { tags: { endpoint: "/health/live" } }],
      [
        "GET",
        url(`/music_api/trending/?limit=${TRENDING_LIMIT}`),
        null,
        { tags: { endpoint: "/music_api/trending/" } },
      ],
      [
        "GET",
        url(`/music_api/search/?q=${encodeURIComponent(PUBLIC_QUERY)}&page=1`),
        null,
        { tags: { endpoint: "/music_api/search/" } },
      ],
      [
        "GET",
        url(`/music_api/search/artists/?q=${encodeURIComponent(PUBLIC_QUERY)}&limit=${SEARCH_LIMIT}`),
        null,
        { tags: { endpoint: "/music_api/search/artists/" } },
      ],
      [
        "GET",
        url(`/api/playlists/public/trending/?limit=${TRENDING_LIMIT}`),
        null,
        { tags: { endpoint: "/api/playlists/public/trending/" } },
      ],
      [
        "GET",
        url(`/music_api/year-chart/?genre=${encodeURIComponent(YEAR_GENRE)}&limit=${TRENDING_LIMIT}`),
        null,
        { tags: { endpoint: "/music_api/year-chart/" } },
      ],
    ]);

    check(responses[0], {
      "health live is 200": (r) => r.status === 200,
    });
    check(responses[1], {
      "trending is 200": (r) => r.status === 200,
    });
    check(responses[2], {
      "search is 200": (r) => r.status === 200,
    });
    check(responses[3], {
      "artist search is 200": (r) => r.status === 200,
    });
    check(responses[4], {
      "public trending is 200": (r) => r.status === 200,
    });
    check(responses[5], {
      "year chart is 200": (r) => r.status === 200,
    });
  });

  if (data && data.token) {
    group("authenticated endpoints", () => {
      const headers = authHeaders(data.token);

      const profileRes = http.get(url("/api/users/me/"), {
        headers,
        tags: { endpoint: "/api/users/me/" },
      });
      const playlistsRes = http.get(url("/api/playlists/me/"), {
        headers,
        tags: { endpoint: "/api/playlists/me/" },
      });

      check(profileRes, {
        "me profile is 200": (r) => r.status === 200,
      });
      check(playlistsRes, {
        "me playlists is 200": (r) => r.status === 200,
      });
    });
  }

  sleep(STEADY_SLEEP);
}
