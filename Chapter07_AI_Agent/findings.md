# Findings — Jira ID to Test Plan Creator

## Current findings

- The project contains the B.L.A.S.T. protocol in `Blast.MD`. Protocol 0 requires project memory, a data schema, and Blueprint approval before any tools are written.
- The stated source candidate is Jira, but no Jira base URL, deployment type, credentials, issue key, custom-field mapping, or delivery target has been supplied.
- A test plan cannot be reliably inferred from a title alone. At minimum it needs the issue key, summary, description, issue type, status, and acceptance criteria. Linked issues, comments, attachments, and external specifications should be opt-in sources because they can add noise or contain sensitive data.
- The Jira REST endpoint differs by deployment. Jira Cloud generally uses REST API v3; Jira Server/Data Center commonly uses REST API v2. Confirm this before implementation.

## Retrieval approach

1. Validate the issue-key format locally (for example, `PROJECT-123`) and normalize whitespace.
2. Retrieve only the fields approved as authoritative; request field names rather than the full issue by default.
3. Optionally retrieve issue links, comments, and attachments according to the confirmed rules and permissions.
4. Convert Jira's rich-text description format to normalized plain text/Markdown while preserving source references.
5. Reject or flag unavailable, redacted, malformed, or ambiguous content. Do not generate claims that Jira does not support.

## Proposed request templates

Use placeholders only. Store values in `.env`; do not put live tokens in Markdown, source, output, or logs.

### Jira Cloud (REST v3)

```bash
curl --request GET \
  --url "${JIRA_BASE_URL}/rest/api/3/issue/${JIRA_ISSUE_KEY}?fields=summary,description,issuetype,status,priority,labels,components,fixVersions,attachment,issuelinks,comment" \
  --user "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  --header "Accept: application/json"
```

For an OAuth bearer token, replace `--user ...` with:

```bash
--header "Authorization: Bearer ${JIRA_ACCESS_TOKEN}"
```

### Jira Server/Data Center (REST v2; confirm with administrator)

```bash
curl --request GET \
  --url "${JIRA_BASE_URL}/rest/api/2/issue/${JIRA_ISSUE_KEY}?fields=summary,description,issuetype,status,priority,labels,components,fixVersions,attachment,issuelinks,comment" \
  --header "Authorization: Bearer ${JIRA_PERSONAL_ACCESS_TOKEN}" \
  --header "Accept: application/json"
```

## Expected response material

Relevant fields are normally found in `key` and `fields`: `summary`, `description`, `issuetype`, `status`, `priority`, `labels`, `components`, `fixVersions`, `attachment`, `issuelinks`, and `comment`. Acceptance criteria may instead be inside `description` or a tenant-specific custom field such as `customfield_12345`; its actual ID and semantics must be confirmed from Jira metadata/administrator documentation.

## Constraints and risks

- Authentication failure (401), authorization failure (403), missing issue (404), rate limiting (429), and transient server errors must be recorded and handled without exposing secret material.
- Jira rich-text formats, custom fields, linked work items, attachments, and comments vary by tenant and may require separate endpoints or permission scopes.
- Attachments may contain sensitive data and should not be sent to an LLM unless the user explicitly authorizes it and retention/privacy requirements are met.
- Generated content is a draft for QA review, not an authoritative replacement for product requirements or execution evidence.
