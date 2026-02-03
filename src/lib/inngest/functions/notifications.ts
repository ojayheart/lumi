import { inngest } from "../client";
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when API key isn't available
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

/**
 * Send email notification via Resend
 */
export const sendEmailNotification = inngest.createFunction(
  {
    id: "notification-send-email",
    retries: 3,
    throttle: {
      // Prevent email spam
      limit: 10,
      period: "1m",
    },
  },
  { event: "notification/send.email" },
  async ({ event, step }) => {
    const { to, subject, body, template, metadata } = event.data;

    const result = await step.run("send-email", async () => {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Lumi <lumi@aro-ha.com>";
      const resend = getResendClient();

      // Use template if specified, otherwise plain text
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        text: body,
        // Could add HTML template support here
        tags: [
          { name: "template", value: template || "default" },
          { name: "source", value: "inngest" },
        ],
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return { email_id: data?.id };
    });

    return {
      success: true,
      email_id: result.email_id,
      to,
      template,
    };
  }
);

/**
 * Handle staff alerts for urgent situations
 */
export const handleStaffAlert = inngest.createFunction(
  {
    id: "notification-staff-alert",
    retries: 2,
  },
  { event: "notification/staff.alert" },
  async ({ event, step }) => {
    const { record_id, reason, severity, guest_email, assigned_to } = event.data;

    // Determine recipients based on severity
    const recipients = await step.run("determine-recipients", async () => {
      const defaultRecipients = [process.env.ALERT_EMAIL || "alerts@aro-ha.com"];

      if (assigned_to) {
        return [assigned_to];
      }

      switch (severity) {
        case "urgent":
          return [
            ...defaultRecipients,
            process.env.URGENT_ALERT_EMAIL || "manager@aro-ha.com",
          ];
        case "high":
          return [
            ...defaultRecipients,
            process.env.HIGH_ALERT_EMAIL || "wellness@aro-ha.com",
          ];
        default:
          return defaultRecipients;
      }
    });

    // Format alert message
    const alertMessage = await step.run("format-alert", async () => {
      const severityEmoji: Record<string, string> = {
        urgent: "🚨",
        high: "⚠️",
        medium: "📋",
        low: "ℹ️",
      };

      return {
        subject: `${severityEmoji[severity]} [${severity.toUpperCase()}] Guest Alert - Lumi`,
        body: `
Alert Type: ${severity.toUpperCase()}
Record ID: ${record_id}
${guest_email ? `Guest: ${guest_email}` : ""}

Reason:
${reason}

---
This alert was generated automatically by Lumi.
View in dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "https://lumi.aro-ha.com"}/admin/alerts/${record_id}
        `.trim(),
      };
    });

    // Send to all recipients in parallel
    const sendResults = await step.run("send-alerts", async () => {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Lumi Alerts <alerts@aro-ha.com>";
      const resend = getResendClient();

      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          resend.emails.send({
            from: fromEmail,
            to: recipient,
            subject: alertMessage.subject,
            text: alertMessage.body,
            tags: [
              { name: "type", value: "staff_alert" },
              { name: "severity", value: severity },
            ],
          })
        )
      );

      return {
        sent: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    });

    // Log high-severity alerts for audit trail
    if (severity === "urgent" || severity === "high") {
      await step.run("log-alert", async () => {
        console.log(
          JSON.stringify({
            type: "staff_alert",
            severity,
            record_id,
            guest_email,
            reason,
            recipients,
            timestamp: new Date().toISOString(),
          })
        );
      });
    }

    return {
      success: true,
      recipients_notified: sendResults.sent,
      severity,
    };
  }
);
