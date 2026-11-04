
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type InvitationEmailInput = {
    email: string;
    organizationName: string;
    invitationUrl: string;
    role: "ADMIN" | "VIEWER";
};

const escapeHtml = (value: string): string => {
    return value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character] ?? character;
    });
};

export const sendInvitationEmail = async ({
    email,
    organizationName,
    invitationUrl,
    role,
}: InvitationEmailInput): Promise<void> => {
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!process.env.RESEND_API_KEY || !fromEmail) {
        throw new Error("Email configuration is missing.");
    }

    const safeOrganizationName = escapeHtml(organizationName);
    const safeInvitationUrl = escapeHtml(invitationUrl);
    const safeRole = escapeHtml(role);

    const { error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Invitation to join ${organizationName} on ATLAS`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>You're invited to join ATLAS</h2>

                <p>
                    You have been invited to join
                    <strong>${safeOrganizationName}</strong>
                    as an <strong>${safeRole}</strong>.
                </p>

                <p>Click below to accept your invitation:</p>

                <a
                    href="${safeInvitationUrl}"
                    style="
                        display: inline-block;
                        padding: 12px 20px;
                        background: #111827;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                    "
                >
                    Accept Invitation
                </a>

                <p>This invitation expires in 7 days.</p>
            </div>
        `,
    });

    if (error) {
        console.error("Invitation email error:", error.message);
        throw new Error("Could not send invitation email.");
    }
};
