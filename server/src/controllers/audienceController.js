import { Event } from '../models/Event.js';
import { recordActivity } from '../services/activityLogService.js';
import {
  approveAudienceCampaign,
  createAudienceCampaign,
  createAudienceCampaignTemplate,
  deleteAudienceCampaignTemplate,
  getAudienceCampaignConfig,
  getAudienceCampaignDashboard,
  getAudienceCampaignExportRows,
  getAudienceCampaignsPage,
  getAudienceCampaignTemplates,
  getAudienceUnsubscribedUsersPage,
  getAudienceUserCampaignHistory,
  getCampaignTrackingPixel,
  sendAudienceCampaignTest,
  trackAudienceCampaignClickByToken,
  trackAudienceCampaignOpenByToken,
  unsubscribeAudienceEmailByToken,
  updateAudienceCampaignConfig,
  updateAudienceCampaignTemplate,
  updateAudienceUserPreferenceByEmail
} from '../services/audienceCampaignService.js';
import {
  getAudienceUsersExportRows,
  getAudienceUsersPage
} from '../services/audienceUserService.js';
import { sendCsv } from '../utils/csv.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const audienceExportFields = [
  { label: 'Name', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Contact Number', value: 'contactNumber' },
  { label: 'Location', value: 'location' },
  { label: 'Current Events', value: 'currentEvents' },
  { label: 'Previous Events', value: 'previousEvents' },
  { label: 'Interested Events', value: 'interestedEvents' },
  { label: 'Payment Statuses', value: 'paymentStatuses' },
  { label: 'Tags', value: 'tags' },
  { label: 'Engagement Level', value: 'engagementLevel' },
  { label: 'Email Opt Out', value: 'emailOptOut' },
  { label: 'Last Engagement', value: 'lastEngagementAt' },
  { label: 'Last Login', value: 'lastLoginAt' }
];

const campaignExportFields = [
  { label: 'Campaign Name', value: 'name' },
  { label: 'Campaign Type', value: 'type' },
  { label: 'Status', value: 'status' },
  { label: 'Subject', value: 'subject' },
  { label: 'Audience Count', value: 'audienceCount' },
  { label: 'Delivered', value: 'deliveredCount' },
  { label: 'Opened', value: 'openCount' },
  { label: 'Clicked', value: 'clickCount' },
  { label: 'Open Rate', value: 'openRate' },
  { label: 'Click Rate', value: 'clickRate' },
  { label: 'Failed', value: 'failedEmailCount' },
  { label: 'Opt Outs Skipped', value: 'skippedOptOutCount' },
  { label: 'Scheduled At', value: 'scheduledAt' },
  { label: 'Launched At', value: 'launchedAt' },
  { label: 'Created By', value: 'createdBy' },
  { label: 'Approved By', value: 'approvedBy' }
];

const buildEventSummaryOptions = async () => {
  const events = await Event.find({ isDeleted: false })
    .select('name sportType venue startDate endDate')
    .sort({ startDate: 1, name: 1 });

  return events.map((event) => ({
    value: String(event._id),
    label: event.name,
    sportType: event.sportType,
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate
  }));
};

export const getAudienceUsers = asyncHandler(async (req, res) => {
  const [pageData, eventOptions] = await Promise.all([
    getAudienceUsersPage(req.query),
    buildEventSummaryOptions()
  ]);

  res.json({
    success: true,
    data: {
      ...pageData,
      filters: {
        eventOptions,
        ...(pageData.filterOptions || {})
      }
    }
  });
});

export const exportAudienceUsers = asyncHandler(async (req, res) => {
  const rows = await getAudienceUsersExportRows(req.query);
  sendCsv(res, rows, audienceExportFields, 'audience-users.csv');
});

export const getAudienceCampaignConfiguration = asyncHandler(async (_req, res) => {
  const config = await getAudienceCampaignConfig();

  res.json({
    success: true,
    data: config
  });
});

export const saveAudienceCampaignConfiguration = asyncHandler(async (req, res) => {
  const config = await updateAudienceCampaignConfig({
    payload: req.body,
    userId: req.user._id
  });

  await recordActivity({
    action: 'update_campaign_config',
    category: 'user_campaign',
    details: 'Updated audience campaign configuration.',
    performedBy: req.user._id,
    subjectType: 'audience_campaign_config',
    subjectId: 'audience-campaign-config',
    summary: 'Updated audience campaign configuration.'
  });

  res.json({
    success: true,
    message: 'Campaign settings updated successfully.',
    data: config
  });
});

export const getAudienceCampaignDashboardSummary = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: await getAudienceCampaignDashboard()
  });
});

export const getAudienceCampaigns = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getAudienceCampaignsPage(req.query)
  });
});

export const exportAudienceCampaigns = asyncHandler(async (_req, res) => {
  const rows = await getAudienceCampaignExportRows();
  sendCsv(res, rows, campaignExportFields, 'audience-campaigns.csv');
});

export const getAudienceCampaignTemplateLibrary = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: await getAudienceCampaignTemplates()
  });
});

export const createAudienceCampaignTemplateItem = asyncHandler(async (req, res) => {
  const template = await createAudienceCampaignTemplate({
    payload: req.body,
    userId: req.user._id
  });

  await recordActivity({
    action: 'create_campaign_template',
    category: 'user_campaign',
    details: `Created audience campaign template "${template.name}".`,
    performedBy: req.user._id,
    subjectType: 'audience_campaign_template',
    subjectId: String(template._id),
    summary: `Created campaign template "${template.name}".`
  });

  res.status(201).json({
    success: true,
    message: 'Campaign template created successfully.',
    data: template
  });
});

export const updateAudienceCampaignTemplateItem = asyncHandler(async (req, res) => {
  const template = await updateAudienceCampaignTemplate({
    payload: req.body,
    templateId: req.params.templateId,
    userId: req.user._id
  });

  await recordActivity({
    action: 'update_campaign_template',
    category: 'user_campaign',
    details: `Updated audience campaign template "${template.name}".`,
    performedBy: req.user._id,
    subjectType: 'audience_campaign_template',
    subjectId: String(template._id),
    summary: `Updated campaign template "${template.name}".`
  });

  res.json({
    success: true,
    message: 'Campaign template updated successfully.',
    data: template
  });
});

export const deleteAudienceCampaignTemplateItem = asyncHandler(async (req, res) => {
  const deleted = await deleteAudienceCampaignTemplate(req.params.templateId);

  await recordActivity({
    action: 'delete_campaign_template',
    category: 'user_campaign',
    details: `Deleted audience campaign template "${deleted.name}".`,
    performedBy: req.user._id,
    subjectType: 'audience_campaign_template',
    subjectId: String(deleted._id),
    summary: `Deleted campaign template "${deleted.name}".`
  });

  res.json({
    success: true,
    message: 'Campaign template deleted successfully.',
    data: deleted
  });
});

export const createAudienceCampaignItem = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await createAudienceCampaign({
      payload: req.body,
      userId: req.user._id
    });
  } catch (error) {
    throw new ApiError(
      400,
      error instanceof Error ? error.message : 'Unable to create audience campaign.'
    );
  }

  const campaign = result.campaign;
  const messageMap = {
    sent: `Sent ${result.sentCount} email(s) successfully.`,
    partial: `Sent ${result.sentCount} email(s). ${result.failedCount} email(s) failed.`,
    scheduled: 'Campaign scheduled successfully.',
    pending_approval: 'Campaign submitted for approval.',
    draft: 'Campaign saved as a draft.'
  };

  await recordActivity({
    action: campaign?.status === 'sent' || campaign?.status === 'partial' ? 'send_campaign' : 'create_campaign',
    category: 'user_campaign',
    details: `Created audience campaign "${campaign?.name || req.body.name}".`,
    metadata: {
      audienceCount: result.totalMatched || 0,
      deliveredCount: result.deliveredCount || 0,
      failedCount: result.failedCount || 0,
      skippedOptOutCount: result.skippedOptOutCount || 0,
      status: campaign?.status || 'draft'
    },
    performedBy: req.user._id,
    subjectType: 'audience_campaign',
    subjectId: String(campaign?._id || ''),
    summary: `Created audience campaign "${campaign?.name || req.body.name}".`
  });

  res.status(201).json({
    success: true,
    message: messageMap[campaign?.status] || 'Campaign created successfully.',
    data: result
  });
});

export const reviewAudienceCampaignItem = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await approveAudienceCampaign({
      action: req.body.action,
      campaignId: req.params.campaignId,
      note: req.body.note,
      userId: req.user._id
    });
  } catch (error) {
    throw new ApiError(
      400,
      error instanceof Error ? error.message : 'Unable to review audience campaign.'
    );
  }

  await recordActivity({
    action: req.body.action === 'reject' ? 'reject_campaign' : 'approve_campaign',
    category: 'user_campaign',
    details: `${req.body.action === 'reject' ? 'Rejected' : 'Approved'} audience campaign "${
      result.campaign?.name || ''
    }".`,
    performedBy: req.user._id,
    subjectType: 'audience_campaign',
    subjectId: String(result.campaign?._id || ''),
    summary: `${req.body.action === 'reject' ? 'Rejected' : 'Approved'} campaign "${
      result.campaign?.name || ''
    }".`
  });

  res.json({
    success: true,
    message:
      req.body.action === 'reject'
        ? 'Campaign returned to draft successfully.'
        : result.campaign?.status === 'scheduled'
          ? 'Campaign approved and scheduled successfully.'
          : 'Campaign approved successfully.',
    data: result
  });
});

export const sendAudienceCampaignTestMessage = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await sendAudienceCampaignTest({
      payload: req.body,
      targetEmail: req.body.targetEmail
    });
  } catch (error) {
    throw new ApiError(
      400,
      error instanceof Error ? error.message : 'Unable to send test campaign email.'
    );
  }

  await recordActivity({
    action: 'send_campaign_test',
    category: 'user_campaign',
    details: `Sent a test campaign email to ${result.targetEmail}.`,
    performedBy: req.user._id,
    subjectType: 'audience_campaign_test',
    subjectId: result.targetEmail,
    summary: `Sent a test campaign email to ${result.targetEmail}.`
  });

  res.json({
    success: true,
    message: `Test email sent successfully to ${result.targetEmail}.`,
    data: result
  });
});

export const getAudienceUnsubscribedUsers = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getAudienceUnsubscribedUsersPage(req.query)
  });
});

export const getAudienceUserCampaignHistoryItems = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await getAudienceUserCampaignHistory(req.query)
  });
});

export const updateAudienceUserPreferenceItem = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await updateAudienceUserPreferenceByEmail({
      email: req.params.email,
      payload: req.body
    });
  } catch (error) {
    throw new ApiError(
      400,
      error instanceof Error ? error.message : 'Unable to update audience preferences.'
    );
  }

  await recordActivity({
    action: 'update_audience_preference',
    category: 'user_campaign',
    details: `Updated audience preference settings for ${result.email}.`,
    performedBy: req.user._id,
    subjectType: 'audience_preference',
    subjectId: result.email,
    summary: `Updated audience preference settings for ${result.email}.`
  });

  res.json({
    success: true,
    message: 'Audience communication preferences updated successfully.',
    data: result
  });
});

export const unsubscribeAudienceEmail = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await unsubscribeAudienceEmailByToken(req.query.token);
  } catch (_error) {
    throw new ApiError(400, 'This unsubscribe link is invalid or expired.');
  }

  res.type('text/html');
  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>TriCore Events Email Preferences</title>
        <style>
          body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
          .card { max-width: 640px; margin: 8vh auto; background: white; border: 1px solid #e2e8f0; border-radius: 28px; padding: 32px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); }
          .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #f97316; }
          h1 { margin: 14px 0 0; font-size: 32px; }
          p { line-height: 1.7; color: #475569; }
        </style>
      </head>
      <body>
        <main class="card">
          <p class="eyebrow">TriCore Events</p>
          <h1>Email preference updated</h1>
          <p>${result.email} has been unsubscribed from future audience campaign emails.</p>
          <p>You can still receive direct transaction or registration communications if required for an active event you joined.</p>
        </main>
      </body>
    </html>
  `);
});

export const trackAudienceCampaignOpen = asyncHandler(async (req, res) => {
  try {
    await trackAudienceCampaignOpenByToken({
      token: req.query.token,
      userAgent: req.get('user-agent') || ''
    });
  } catch (_error) {
    // Tracking endpoints should stay silent for email clients.
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.end(getCampaignTrackingPixel());
});

export const trackAudienceCampaignClick = asyncHandler(async (req, res) => {
  let redirectUrl = '';

  try {
    const result = await trackAudienceCampaignClickByToken({
      token: req.query.token,
      userAgent: req.get('user-agent') || ''
    });
    redirectUrl = result.redirectUrl || '';
  } catch (_error) {
    redirectUrl = '';
  }

  if (!redirectUrl) {
    redirectUrl = '/';
  }

  res.redirect(302, redirectUrl);
});
