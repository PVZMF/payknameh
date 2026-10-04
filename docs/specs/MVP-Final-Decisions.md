**Payknameh (پیک‌نامه)**

MVP Final Decisions Document

Version 1.2 — Mehr 1405 (October 2026)

# **1. Summary**

Payknameh is a Persian-first digital event platform whose first version focuses on Iranian weddings. The invitation is not the product itself; it is the entry point to the event experience. The product has two parts: the **host web app** for creating and managing the event, and the **guest PWA** for opening the personal invitation, viewing event information, and submitting a response.

The MVP has to answer only one question:

**Does Payknameh make it easier for a real Iranian couple to invite their guests and know exactly who is coming to which part of the event?**

The core loop that must work completely and reliably:

1. Create the event
2. Define sessions (aqd/marriage ceremony, wedding reception, separate women's/men's gatherings, etc.)
3. Build the guest list in a family tree (candidates)
4. Select the invited households
5. Assign households to sessions with attendee caps
6. Create and publish the invitation
7. Send the link or SMS
8. Guest opens the invitation
9. Guest responds per session
10. Host sees accurate stats for each session in the dashboard

## **1.1 Market and differentiation**

The Iranian market has direct competitors. "A personal link per guest + RSVP" is no longer a differentiator; it is the user's minimum expectation.

| **Competitor** | **Model and key features** |
| --- | --- |
| Davati (davati.fun) | Personal page per guest with companion capacity, SMS sending, RSVP, Android app. Free template, separate charges for templates, SMS and optional features. |
| Talarkadeh | Templates from free to VIP, guest list and RSVP, venue map, memorial message, login with SMS code. Acquisition channel via its venue (hall) directory. |
| Jashnlink | Done-for-you design by a design team, delivery within 12 hours, about 1.6–1.7 million tomans. |
| DigiDavat | Card with location, countdown, RSVP, and an animation of the card coming out of an envelope. |

**Payknameh's differentiation** must come from: session-level responses (for aqd, wedding and separate gatherings), the guest tree and candidates, serious privacy, and template design quality. Before building starts, the team should create a real card on Davati and Talarkadeh and document their weaknesses.

# **2. Domain principles**

These principles are the foundation of the whole data model and must not be violated during the build.

| **Principle** | **Meaning in practice** |
| --- | --- |
| Event is a container | Represents the overall celebration. Operational date, time and place are not on Event; only general info and defaults. |
| Session is the operational unit | Each session owns its own date, time, venue, address, coordinates and RSVP deadline. |
| Household is the invitation unit | Each household has one invitation link. The salutation (displayName) is free text and is not derived from the surname. |
| Household × Session is the response unit | The attendee cap (maxAttendees) and the guest's response are stored on HouseholdSession. |
| Overall status is computed | No global status is stored on Household. No response means "pending"; no PENDING row is created. |
| The guest list is built before inviting | Each household has an invitation state: candidate, invited or excluded. Links and cards are only created for invited households. |
| The personal card is built on the fly | No separate page is generated per household. The template, the published content and the household data are combined when the link is opened. |
| Responses have history | Every response change, by guest or host, is recorded append-only in RSVPEvent. |

# **3. MVP scope**

## **3.1 Authentication**

- Host login and signup with mobile number and one-time code (OTP). Email and password are not in the MVP.

- Phone numbers normalized to E.164 (supporting inputs like 0912, +98912 and Persian digits).

## **3.2 Host**

- Create the event and its general info (couple's names, event type, optional parents' names)

- Create, edit and reorder sessions with independent date, time, venue and RSVP deadline

- Guest tree: hierarchical groups for the bride's side, groom's side and shared, with a ready-made Iranian family skeleton

- Manage households and household members, with state candidate, invited or excluded

- Tree view with invited and remaining counts per branch, and display of how full each session's venue capacity is

- Optional personal message per household

- Assign households to sessions with a separate attendee cap per session

- One very high-quality Persian invitation template, content editing, image upload, preview and publish

- Preview the card as a specific household

- Create, revoke and rotate each household's personal link

- Session-level response dashboard: accepted, declined, pending, expected headcount

- Host can enter or correct a response (with history)

- Sharing: copy link, native device share, "sent" mark, SMS sending

## **3.3 Guest**

- Secure personal invitation, no account required

- "We have an invitation for you" entry page with an open button (and optional music playback)

- Shows the household's salutation, the personal message (if any) and only the assigned sessions

- Each session's location with routing buttons for Neshan, Balad and Google Maps

- Countdown, add to calendar (ICS and Google Calendar)

- Separate response per session, respecting attendee cap and RSVP deadline

- Basic offline shell so essential information stays available

# **4. Out of MVP scope**

These are intentionally not built so the core loop can be validated with real events: photo gallery, guestbook, QR check-in, table seating, budget management, tasks and vendors, advanced analytics, AI agent (the first feature after the MVP; section 14), template marketplace and designer revenue share (section 13), push notifications and automatic reminders, native iOS and Android apps, two-way Google Calendar sync, WhatsApp Business, organization dashboard, editor-invite UI, subscription and payment.

The data model (Organization and EventMember) is designed so these can be added later without a redesign.

# **5. Data model**

| **Entity** | **Key fields** | **Note** |
| --- | --- | --- |
| Organization | id, name | A personal organization is created automatically at signup. No UI. |
| User | id, phoneE164 | Normalized number, unique. |
| OTPChallenge | phoneE164, codeHash, expiresAt, consumedAt, attempts | The code is never stored in plain text. |
| Event | organizationId, title, coupleNames, parents, timezone | Event container. timezone defaults to Asia/Tehran. |
| EventMember | eventId, userId, role | Roles: OWNER and EDITOR. Model and access checks, no invite UI. |
| Session | eventId, title, startsAt, endsAt, venueName, address, lat, lng, capacity, rsvpDeadline, sortOrder, deletedAt | Map links are built from coordinates. capacity = venue capacity, optional. Soft delete. |
| Household | eventId, displayName, phoneE164, groupId, invitationState, personalNote, notes | Salutation is free text. invitationState: CANDIDATE, INVITED, EXCLUDED. |
| HouseholdMember | householdId, firstName, lastName | For management; responses in the MVP are count-based. |
| HouseholdGroup | eventId, parentId, side, name, sortOrder, fromSkeleton | Tree. side: BRIDE, GROOM, SHARED. Basis for the tree view and group assignment. |
| HouseholdSession | householdId, sessionId, maxAttendees, removedAt | Unique on (householdId, sessionId). Soft delete. |
| RSVPResponse | householdSessionId, status, attendeeCount, updatedAt | Current response state (ACCEPTED or DECLINED). |
| RSVPEvent | rsvpResponseId, status, attendeeCount, actorType, actorUserId, createdAt | Append-only history. actorType: GUEST or HOST. |
| GuestAccessToken | householdId, tokenHash, tokenEncrypted, revokedAt, firstViewedAt, lastViewedAt | Views are recorded on the token. |
| InvitationTemplate | id, slug, tier, authorId, version, status, schema | tier: FREE or PREMIUM. authorId for future designer revenue share. Every template change creates a new version. |
| Invitation | eventId, templateId, templateVersion, draftContent, publishedContent, publishedAt | One per event. Template version is pinned at publish. Guests only see the published version. |
| InvitationDelivery | householdId, channel, status, sentAt, deliveredAt, failedAt, providerMessageId, errorCode | States: NOT_SENT, SENT, DELIVERED, FAILED. |
| EventImage | eventId, storageKey, mime, size, width, height | File in object storage; DB holds metadata only. |

Main relations: each Organization has many Events. Each Event has many Sessions, Households and EventMembers, and one Invitation. Household and Session are many-to-many via HouseholdSession. Each HouseholdSession has at most one RSVPResponse, and each RSVPResponse has many RSVPEvents.

# **6. Final domain rules**

## **6.1 Public entry page and view tracking**

Messenger servers (Telegram, etc.) open the same tokenized URL to build link previews. So that view stats are not corrupted and personal data does not reach their servers:

- The invitation page's initial HTML contains only public content: couple's names, general date, public image and an "Open invitation" button.

- Household name, sessions and response state are loaded via a client-side request after the button is pressed.

- A view is recorded only at this step, not when the page is requested.

- Open Graph tags contain only public info. Invitation pages are noindex,nofollow (both meta tag and X-Robots-Tag header).

## **6.2 Guest token**

- At least 128 bits of entropy, compactly encoded (about 22 base62 characters).

- Lookup is done by token hash. An encrypted copy is also kept so the host can copy the link again at any time.

- Rotating a token means immediately revoking the previous token and creating a new one. A revoked token stops working immediately.

- Short URL structure for SMS: https://<short-domain>/i/<token>.

## **6.3 Invitation draft and publish**

- The host always works on draftContent.

- Publishing creates a snapshot in publishedContent and pins the template version in templateVersion. Guests always see the latest published version with that template version; later template updates do not change published cards.

- Host preview runs on a separate route with host authentication and never records a view.

- The host can pick a specific household and preview the card exactly as that household sees it (salutation, personal message, sessions and attendee caps). This preview also does not record a view.

## **6.4 Response (RSVP) rules**

- Responses are count-based: "Yes, definitely" or "Unfortunately I can't", and if accepted, the number of attendees up to maxAttendees.

- ACCEPTED means attendeeCount ≥ 1 and at most maxAttendees. DECLINED means an empty count. This rule is validated in the domain layer, not just in the form.

- The guest can change their response until the deadline.

- The RSVP deadline is enforced server-side. After the deadline the form becomes read-only and shows "To change your response, please contact the host".

- The host can always, even after the deadline, enter or correct a response. Every change is recorded in the history with actorType and time.

## **6.5 Changes after a guest response**

| **Situation** | **System behavior** |
| --- | --- |
| maxAttendees reduced below the accepted count | The response is kept and shown in the dashboard with an "inconsistent" tag so the host can decide. |
| Household removed from a session it responded to | Soft delete of HouseholdSession; response and history are archived and excluded from stats. |
| Session time or venue changed | The change is applied and the dashboard shows the host how many households had already responded. No automatic notification in the MVP. |
| Deleting a session that has responses | Only with explicit host confirmation; soft delete. |

## **6.6 Guest tree and candidates**

The goal of this section is to reduce the host's confusion when building the guest list: who is there and who is still missing.

- When an event is created, the tree is pre-filled with a **ready-made Iranian family skeleton** for both sides: paternal relatives (paternal uncles and aunts — amoo, ameh), maternal relatives (maternal uncles and aunts — daei, khaleh), family friends, neighbors, coworkers, university friends and bridesmaids/groomsmen. The host can delete, add or move branches.

- An empty branch is itself a reminder and is visibly marked in the tree view.

- A new household is CANDIDATE by default. Once the host confirms it becomes INVITED, and only then gets a token and link. EXCLUDED means intentionally not invited and excluded from the "remaining" count.

- Each tree node shows: invited count, remaining candidate count, and complete/incomplete status.

- For every session with a capacity, the sum of invited households' attendee caps is shown against the venue capacity, with a warning when it is exceeded.

- Changing a household from INVITED to CANDIDATE or EXCLUDED after the link was sent revokes the token and requires explicit confirmation.

## **6.7 Personal message**

- Optional personalNote field on each household, e.g. "Dear uncle, the celebration isn't complete without you". If empty, it is not shown on the card.

- Like all other personal content, it is loaded client-side only after the invitation is opened, and is never in the initial HTML or OG tags. It is plain text and escaped.

## **6.8 Map and location**

- Coordinates (lat, lng) are the primary source. Neshan, Balad and Google Maps links are built from them.

- Location input for the host: paste a Neshan, Balad or Google Maps link (and extract the coordinates from it), or drop a pin on the map. The host never types coordinates manually.

## **6.9 Date and time**

- Date input and display in the UI are Jalali (Persian calendar date picker).

- Standard timestamps are stored in the database. timezone is on Event with default Asia/Tehran. A Jalali date string is never the source of truth.

# **7. SMS and delivery**

- The SmsProvider interface is built in **Phase 1**, together with ConsoleSmsProvider, which prints the code to the log in local development. Development does not depend on any SMS vendor.

- The same interface is used for OTP and for invitation SMS. Vendor-specific logic stays outside the domain layer.

- OTP rate limiting is applied both per phone number and per IP (to counter SMS pumping).

- A Persian SMS segment is about 70 characters; a short domain and short text directly affect cost.

- Restrictions on sending links from the vendor's sender number must be checked before choosing a vendor.

# **8. Security and privacy**

- All access checks are server-side.

- A guest can only access their own household and assigned sessions, and cannot see other households or guess IDs.

- No sequential IDs or database keys in public URLs.

- Input validation, output escaping, XSS and CSRF protection, secure cookies, and rate limiting on public guest routes.

- Image upload: check the real MIME type, size, dimensions and file name. The browser's Content-Type is not trusted.

- The offline cache only contains safe guest information; no host data or guest lists are cached.

# **9. Infrastructure and technology**

- Next.js, strict TypeScript (no any), Tailwind CSS, shadcn/ui, a PostgreSQL-compatible database, object storage, PWA support.

- Vazirmatn font, self-hosted. No dependency on external font CDNs in the guest experience.

- The guest page loads with no third-party scripts and no external analytics.

- Hosting location and CDN are an architecture decision, not a deployment detail: the guest page must remain reachable from inside Iran during internet disruptions.

- The UI is Persian-only, but strings are separated from components and CSS uses logical properties.

# **10. Implementation order**

| **Phase** | **Content** |
| --- | --- |
| 1. Foundation | Project setup, database, SmsProvider and ConsoleSmsProvider, OTP login, User, Organization and Event, access layer |
| 2. Event structure | Event and Session, date and time with Jalali date picker, venue and coordinates input, RSVP deadline |
| 3. Guests | Group tree and family skeleton, Household and members, candidate and invite states, personal message, tree view, HouseholdSession and attendee caps, venue capacity, secure tokens |
| 4. Invitation | One premium Persian template with versioning, renderer, draft and publish with template version pinning, host preview and preview-as-household, short link |
| 5. Guest PWA | Public entry page, client-side loading of personal content, sessions, map, countdown, response, deadline, calendar, offline shell |
| 6. Response dashboard | Session-level stats, expected headcount, host-entered responses, history, "inconsistent" tag |
| 7. Delivery | Invitation SMS, delivery status, copy link, native share, "sent" mark |

No future module starts before this path works completely and stably.

# **11. Acceptance criteria**

## **11.1 End-to-end test**

A brand-new host must be able to complete this path: sign up and verify the number via OTP, create an event, create two sessions with different dates and venues, add several households as candidates in tree branches, turn one into invited with a personal message and members, assign that household to both sessions with different attendee caps, create and publish the invitation, get the short link and send it, open the link on mobile, see the correct salutation and only the assigned sessions, respond differently to the two sessions, and see correct stats for each session in the dashboard.

## **11.2 Required tests**

- OTP: request, expiry, reuse prevention, rate limiting per phone number and IP

- Event ownership and EventMember access

- Response: accept, decline, count validation, session-level response, lock after deadline, host entry, history

- Token: secure access, immediate revocation, rotation

- A guest cannot access another household or host routes

- A page request without interaction (e.g. a preview bot) records no view, and the initial HTML contains no household personal information

- Host preview records no view

- Draft edits are not visible to guests before publishing

- Reducing the attendee cap below an existing response creates an "inconsistent" tag

- A candidate or excluded household has no link and its token (if any) does not work

- Invited and remaining counts on each tree node match the data

- Preview-as-household shows the same content as the guest and records no view

- The personal message is shown only to that household and is escaped

- Publishing a new template version does not change cards published with the previous version

# **12. Success metrics**

- **Primary metric — response completion rate:** responding households divided by invited households, overall and per session.

- **Secondary metric — response rate without follow-up:** share of households that responded without any call or manual follow-up by the host.

Measurement: the first few events are launched with direct team support, and the follow-up rate is measured through interviews with the couples. Responses recorded with actorType = HOST are an auxiliary signal of phone follow-up.

# **13. Templates, customization and revenue model**

Payment and subscriptions are not implemented in the MVP, but this section sets the product direction so the data model and templates are built correctly from the start.

## **13.1 Pricing principle**

- **One-time payment per event**, not per guest. A per-guest credit model is expensive and confusing for large Iranian weddings.

- **The core loop is always free:** one high-quality template, session-level responses, the guest tree, personal links. Reliability of response data never goes behind a paywall.

- **What is sold is feeling and beauty:** premium templates, envelope-opening animation, music, and removing the "Made with Payknameh" branding from the card.

- **SMS** is sold separately, based on actual cost.

- The "Made with Payknameh" branding on free cards is the main growth channel: each event introduces hundreds of guests to the product.

## **13.2 Three levels of customization**

| **Level** | **When** | **Description** |
| --- | --- | --- |
| 1. Content | MVP | Text, photos, names, parents' names and messages. No design controls. |
| 2. Curated options | Right after the MVP | Choose from several color palettes, several font pairs and several decoration sets per template. A sense of choice for the host, without the ability to break the design. No free-form editor. |
| 3. Custom design | Offerable from the start, manually | Template design or modification by a human designer as a paid service. Initially without technical infrastructure, delivered via freelance design teams. |

## **13.3 No-code template format**

MVP templates are code components, but their structure must move from the start toward a format in which a designer can build a template without writing code:

- One of a few **fixed layouts** built and maintained by the tech team.

- **Design tokens:** colors, fonts, spacing and radii.

- **Decorative assets** as SVG and images, with security validation (sanitized SVG).

- A **schema** of editable fields and display settings (e.g. show or hide parents' names).

Customization level 2 requires exactly this format. Building it also automatically opens the path to a template marketplace.

## **13.4 Template marketplace and designer share (roadmap)**

- A **curated** model in the style of Minted, not an open marketplace: designers are invited or selected (e.g. through a design competition) and every template gets a quality review before publishing.

- Proposed payment model: an upfront amount for an accepted template, plus a percentage of each sale of that template. A revenue-pool model (Canva-style) only makes sense at very large scale and is not chosen.

- **What is sold is the template, not the card.** A card created by a host contains family information and is never sellable or publicly shareable.

- Prerequisites: the no-code template format (13.3), a payment gateway, contracts and settlement with designers, and license review of each template's fonts and images.

## **13.5 Preparation in the MVP**

- InvitationTemplate entity with tier, authorId and version fields.

- Pinning the template version at publish (Invitation.templateVersion).

- Separating the renderer from the host dashboard and defining a schema for the template, even with a single template.

# **14. Roadmap: AI agent**

An AI agent to help build the guest list is **the first feature after MVP validation**. The group tree and candidate state in the MVP already prepare the structured data it needs.

## **14.1 Capabilities**

- **Free text to households:** the host writes or pastes "Uncle Hassan and his wife with two kids, Aunt Maryam alone" and the agent converts it into structured households with the right branch and headcount. The most important use case.

- **Guided conversation** to complete each branch, with questions like "Are Uncle Hassan's children married? Are they invited separately?"

- **Duplicate household detection**, balance between the two sides, and warnings when nearing venue capacity.

- Later: suggesting invitation text and personal messages.

## **14.2 Rules**

- The agent only suggests and creates households as CANDIDATE. No invitation or sending happens without the host's explicit confirmation.

- The agent uses the same app domain services (with the same access checks) and has no separate logic.

- Every change the agent proposes is shown to the host in a reviewable form before being applied.

## **14.3 Risks**

- **Model access:** most major LLM services do not serve Iran. Technical access and legal/sanctions issues must be checked before building. The alternative is an open-source model on our own server, whose Persian quality must be evaluated separately.

- **Privacy:** family member names and family relationships are sensitive data. Sending them to a third-party service requires the host's explicit notice and consent.

# **15. Open decisions**

These must be finalized before or during Phase 1:

- Hosting provider and CDN, considering reachability from inside Iran

- SMS provider and restrictions on sending links from the sender number

- Short domain for invitation links and its registration

- API key and limits of Neshan or Balad maps for location picking

- ORM choice (Prisma or Drizzle)

- Final list of Iranian family skeleton branches (via interviews with several couples)

- AI model for the next phase: access, hosting location and Persian quality

- Paid tier price and the exact free/paid feature boundary

- Contract terms and template designers' share

- First-hand evaluation of competitors (Davati, Talarkadeh) by building a real card
