/**
 * @file This file contains the Zod schemas for validating Branch deep link parameters.
 * It defines the shape of the data used to create and manage deep links, including
 * analytics tags, redirection behavior, and social media preview settings.
 */
import { z } from 'zod';

/**
 * Defines the available URI redirect modes for Branch links.
 * These modes control how the link behaves when a user without the app installed clicks it.
 */
const uriRedirectModes = {
  SMART_REDIRECT: '0 - (Default) Tries to open the app, but falls back gracefully to the App Store/Play Store.',
  FORCE_APP_OPEN: '1 - Tries to force open the app. Can show an error if the app is not installed.',
  FORCE_APP_OPEN_IFRAME: '2 - A legacy method for forcing the app to open, particularly for tricky platforms like Instagram.'
} as const;

/**
 * Defines the types of links that can be created.
 * This helps differentiate between standard deep links and marketing links (Quick Links).
 */
const linkTypes = {
  STANDARD: '0 - A standard deep link that is not visible on the dashboard.',
  MARKETING: '2 - A link that is visible on the marketing dashboard (Quick Links).'
} as const;

const uriRedirectModesTable = [
  '| Mode | Value | Description |',
  '| :--- | :--- | :--- |',
  ...Object.entries(uriRedirectModes).map(([key, value]) => `| ${key} | ${value.split(' - ')[0]} | ${value.split(' - ')[1]} |`)
].join('\n');

const linkTypesTable = [
  '| Type | Value | Description |',
  '| :--- | :--- | :--- |',
  ...Object.entries(linkTypes).map(([key, value]) => `| ${key} | ${value.split(' - ')[0]} | ${value.split(' - ')[1]} |`)
].join('\n');

/**
 * Zod schema for validating the parameters used to create a Branch deep link.
 * This schema covers a wide range of properties, including analytics data, redirection rules,
 * social media metadata, and custom data payloads.
 */
export const deepLinkParamsSchema = z.object({
  data: z.object({
    // Analytics and Custom Data
    '~campaign': z.string().optional().describe('The name of the campaign associated with your link.'),
    '~channel': z.string().optional().describe('The route that your link reaches your users by (e.g., Facebook, LinkedIn).'),
    '~feature': z.string().optional().describe('The feature of your app associated with the link (e.g., referral).'),
    '~stage': z.string().optional().describe('The progress or category of a user when the link was generated.'),
    '~tags': z.array(z.string()).optional().describe('Free-form labels to organize your link data.'),
    '~creative_id': z.string().optional().describe('Identifier for the creative variation.'),

    // Redirection and Behavior Control
    '$fallback_url': z.string().url().optional().describe('Default fallback URL for all platforms.'),
    '$desktop_url': z.string().url().optional().describe('The URL to redirect to on desktop devices.'),
    '$ios_url': z.string().url().optional().describe('The fallback URL for iOS devices.'),
    '$android_url': z.string().url().optional().describe('The fallback URL for Android devices.'),
    '$web_only': z.boolean().optional().describe('Force the link to open in a web browser, overriding app-open behavior.'),
    '$uri_redirect_mode': z.enum(Object.keys(uriRedirectModes) as [keyof typeof uriRedirectModes]).optional().describe(`Controls app-opening behavior.\n\n${uriRedirectModesTable}`),
    '$ios_deepview': z.string().optional().describe('The name of the deepview template to use for iOS.'),
    '$android_deepview': z.string().optional().describe('The name of the deepview template to use for Android.'),

    // Open Graph (OG) and Content Properties
    '$og_title': z.string().optional().describe('The title to be used for social sharing previews.'),
    '$og_description': z.string().optional().describe('The description to be used for social sharing previews.'),
    '$og_image_url': z.string().url().optional().describe('The URL of the image to be used for social sharing previews.'),
    '$canonical_identifier': z.string().optional().describe('A unique identifier for the content being shared.'),
    '$canonical_url': z.string().url().optional().describe('The canonical URL for the content, used for SEO and content de-duplication.')
  }).passthrough().optional().describe('A dictionary of link control parameters, analytics tags, and custom data.'),
  alias: z.string().max(128).optional().describe('A unique, immutable vanity alias for the link (e.g., my-link-name). If a link with the same alias and parameters is created, the original URL is returned. A 409 conflict error is returned if the alias exists with different parameters.'),
  type: z.enum(Object.keys(linkTypes) as [keyof typeof linkTypes]).optional().describe(`The type of link.\n\n${linkTypesTable}`),
  duration: z.number().optional().describe('The time in seconds that a click can be matched to a new app session. Defaults to 7200 (2 hours).'),
  identity: z.string().optional().describe('User identity to associate with the link.'),
  tags: z.array(z.string()).optional().describe('Tags for organizing link data.'),
  campaign: z.string().optional().describe('Campaign name.'),
  feature: z.string().optional().describe('App feature associated with the link.'),
  channel: z.string().optional().describe('The channel the link is shared on.'),
  stage: z.string().optional().describe('The user stage when the link was generated.')
});
