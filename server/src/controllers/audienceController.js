import { Event } from '../models/Event.js';
import { recordActivity } from '../services/activityLogService.js';
import {
  getAudienceCampaignConfig,
  getAudienceCampaignsPage,
  sendAudienceCampaignMessage,
  unsubscribeAudienceEmailByToken,
  updateAudienceCampaignConfig
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
  { label: 'Current Events', value: 'currentEvents' },
  { label: 'Previous Events', value: 'previousEvents' },
  { label: 'Interested Events', value: 'interestedEvents' },
  { label: 'Email Opt Out', value: 'emailOptOut' },
  { label: 'Last Engagement', value: 'lastEngagementAt' },
  { label: 'Last Login', value: 'lastLoginAt' }
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
        eventOptions
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

export const getAudienceCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await getAudienceCampaignsPage(req.query);

  res.json({
    success: true,
    data: campaigns
  });
});

export const sendAudienceCampaign = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await sendAudienceCampaignMessage({
      payload: req.body,
      userId: req.user._id
    });
  } catch (error) {
    throw new ApiError(400, error instanceof Error ? error.message : 'Unable to send campaign.');
  }

  await recordActivity({
    action: 'send_campaign',
    category: 'user_campaign',
    details: `Sent audience campaign "${req.body.name}" to ${result.sentCount} contact(s).`,
    metadata: {
      audienceCount: result.totalMatched,
      failedCount: result.failedCount,
      skippedOptOutCount: result.skippedOptOutCount
    },
    performedBy: req.user._id,
    subjectType: 'audience_campaign',
    subjectId: String(result.campaign?._id || ''),
    summary: `Sent audience campaign "${req.body.name}".`
  });

  res.status(201).json({
    success: true,
    message:
      result.failedCount > 0
        ? `Sent ${result.sentCount} email(s). ${result.failedCount} email(s) failed.`
        : `Sent ${result.sentCount} email(s) successfully.`,
    data: result
  });
});

export const unsubscribeAudienceEmail = asyncHandler(async (req, res) => {
  let result;

  try {
    result = await unsubscribeAudienceEmailByToken(req.query.token);
  } catch (error) {
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
