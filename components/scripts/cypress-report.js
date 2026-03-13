const axios = require('axios');
const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const CYPRESS_PROJECT_ID = 'eb7imi';
const CYPRESS_API_TOKEN = process.env.CYPRESS_API_TOKEN;
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#cypress-reports';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

async function fetchRuns() {
  const url = `https://api.cypress.io/projects/${CYPRESS_PROJECT_ID}/runs`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${CYPRESS_API_TOKEN}` }
  });
  return res.data;
}

function summarizeRuns(runs) {
  return runs.map(run => ({
    id: run.id,
    status: run.status,
    totalTests: run.totalTests,
    totalPassed: run.totalPassed,
    totalFailed: run.totalFailed,
    browser: run.browserName,
    tags: run.tags,
    group: run.group,
    createdAt: run.createdAt
  }));
}

function formatSummary(summary) {
  return summary.map(run =>
    `Run ${run.id}: ${run.status} | ${run.totalPassed}/${run.totalTests} passed | Failed: ${run.totalFailed} | Browser: ${run.browser} | Tags: ${run.tags} | Group: ${run.group} | Created: ${run.createdAt}`
  ).join('\n');
}

async function sendSlack(summaryText) {
  if (!SLACK_TOKEN) return;
  const slack = new WebClient(SLACK_TOKEN);
  await slack.chat.postMessage({
    channel: SLACK_CHANNEL,
    text: `Cypress Run Summary:\n${summaryText}`
  });
}

async function sendEmail(summaryText) {
  if (!EMAIL_USER || !EMAIL_PASS || !EMAIL_TO) return;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
  await transporter.sendMail({
    from: EMAIL_USER,
    to: EMAIL_TO,
    subject: 'Cypress Run Summary',
    text: summaryText
  });
}

async function main() {
  const runs = await fetchRuns();
  const summary = summarizeRuns(runs);
  console.log('Cypress Run Summary:', summary);
  const summaryText = formatSummary(summary);
  await sendSlack(summaryText);
  await sendEmail(summaryText);
}

main().catch(err => {
  console.error('Error fetching Cypress analytics:', err);
  process.exit(1);
});