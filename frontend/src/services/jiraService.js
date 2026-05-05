/**
 * jiraService — frontend calls to the JIRA API proxy backend.
 *
 * All functions accept a `headers` object (from useJiraAuth.getHeaders())
 * which contains x-jira-domain, x-jira-email, x-jira-token.
 *
 * The backend forwards these to JIRA Cloud — credentials never go
 * directly from the browser to Atlassian.
 */

import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

/** Fetches a ticket by issue key (e.g. QA-123). */
export async function fetchTicket(issueKey, headers) {
  const res = await axios.get(`${API_BASE}/api/jira/ticket/${issueKey.toUpperCase().trim()}`, { headers });
  return res.data;
}

/** Creates a new JIRA ticket. Returns { key, url }. */
export async function createTicket(payload, headers) {
  const res = await axios.post(`${API_BASE}/api/jira/ticket`, payload, { headers });
  return res.data;
}

/** Posts a plain-text comment to a JIRA ticket. */
export async function postComment(issueKey, comment, headers) {
  const res = await axios.post(
    `${API_BASE}/api/jira/ticket/${issueKey.toUpperCase().trim()}/comment`,
    { comment },
    { headers }
  );
  return res.data;
}

/** Searches issues by JQL query. */
export async function searchIssues(jql, headers, maxResults = 20) {
  const res = await axios.post(`${API_BASE}/api/jira/search`, { jql, max_results: maxResults }, { headers });
  return res.data.issues;
}

/** Returns all accessible JIRA projects. */
export async function fetchProjects(headers) {
  const res = await axios.get(`${API_BASE}/api/jira/projects`, { headers });
  return res.data.projects;
}
