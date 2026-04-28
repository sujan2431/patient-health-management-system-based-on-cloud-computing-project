import twilio from "twilio";

import { env } from "../config/env.js";

export async function sendEmail({ to, subject, body }) {
  // Mock email sender (replace with AWS SES, SendGrid, etc. in production)
  // eslint-disable-next-line no-console
  console.log(`[EMAIL MOCK] to=${to} subject="${subject}" body="${body?.slice?.(0, 200) ?? body}"`);
}

let twilioClient = null;

function getTwilioClient() {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!twilioClient) twilioClient = twilio(sid, token);
  return twilioClient;
}

export async function sendSms({ to, message }) {
  if (!to || !to.startsWith("+91")) {
    // eslint-disable-next-line no-console
    console.log(`[SMS BLOCKED] Cannot send to ${to}, only Indian numbers (+91) allowed.`);
    return { sent: false, error: "Only Indian numbers (+91) allowed" };
  }

  const from = env.TWILIO_PHONE_NUMBER;
  const client = getTwilioClient();

  if (client && from) {
    await client.messages.create({
      body: message,
      from,
      to
    });
    // eslint-disable-next-line no-console
    console.log(`[SMS] sent to=${to}`);
    return { sent: true };
  }

  // eslint-disable-next-line no-console
  console.log(`[SMS MOCK] to=${to} message="${message?.slice?.(0, 200) ?? message}"`);
  return { sent: false, mock: true };
}

export async function notifyPatientCreated({ patientEmail, doctorEmail, patientName }) {
  if (!patientEmail) return;
  await sendEmail({
    to: patientEmail,
    subject: "You have been added as a patient",
    body: `Hello! Dr. ${doctorEmail} created a new patient record for ${patientName}.`
  });
}

export async function notifyReportUploaded({ patientEmail, doctorEmail, patientName, reportId }) {
  if (!patientEmail) return;
  await sendEmail({
    to: patientEmail,
    subject: "New medical report available",
    body: `A new report (${reportId}) was uploaded for ${patientName} by ${doctorEmail}.`
  });
}

/**
 * SMS sent when a patient user is linked to a chart (optional phone_e164 on link API).
 */
export async function notifyPatientLinked({ phoneE164, patientEmail, patientName }) {
  const portalUrl = env.PATIENT_PORTAL_URL ?? "http://localhost:5173";
  const message =
    `PHMS: Your health record for "${patientName}" is now linked to ${patientEmail}. Sign in: ${portalUrl}`;

  return sendSms({ to: phoneE164, message });
}
