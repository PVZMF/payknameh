**Payknameh — Business Strategy, Marketing and Logs**

Mehr 1405 (October 2026) · Companion to the "MVP Final Decisions Document", version 1.2

# 1. Summary

Payknameh has three customer segments, each with its own pricing model, acquisition channel and product needs: one-time couples, repeat families, and event professionals. The MVP focuses only on weddings and the first segment, but the data model is prepared now for the other two.

This document complements the "MVP Final Decisions Document" (version 1.2) and covers three topics: business strategy and pricing per segment, marketing and acquisition channels, and logs (financial, app performance and product events).

The MVP document's constraints apply here too: no third-party scripts or analytics on the guest page, hosting inside Iran, and serious privacy for family data.

# 2. Customer segmentation

A wedding customer is usually one-time, so growth must come from guests, referrals and repeat customers, not from retaining the couple.

| **Attribute** | **1. One-time** | **2. Repeat families** | **3. Professionals (B2B)** |
| --- | --- | --- | --- |
| **Who** | A couple holding only their own wedding | A family with several events over several years: children's weddings, birthdays, henna nights, anniversaries, parties | Wedding planners, event catering/hospitality services (tashrifat), venues, event agencies, companies |
| **Number of events** | 1 | 2 to 5 over several years | Dozens per year |
| **Pricing model** | One-time payment per event | Multi-event bundle or prepaid credit | Annual subscription or bulk credit |
| **Key need** | Simplicity, beauty, accurate responses | Reusing the guest list | Multi-event dashboard, team, their own brand |
| **Acquisition channel** | Guests, SEO, Instagram | Conversion from segment 1 | Direct sales and partner program |
| **Primary metric** | Revenue per event, referral rate | Rate of a second event within 12 months | Events per organization per month, renewal rate |

# 3. Strategy per segment

## 3.1 One-time customers

Goal: maximum value from a single purchase moment, and turning the customer into an acquisition channel.

- **Price:** free core and one-time payment for beauty and features, per MVP §13. A complete bundle (premium template, branding removal, music and some SMS) priced below the sum of its parts simplifies the purchase decision.

- **Payment point:** after building the list and before publishing or sending SMS. At this point the host has invested time and seen the product's value.

- **Growth:** CTA on the card and a referral code after the event (section 5).

- **Bridge to segment 2:** the account is not "finished" after the event. The couple's mother may have another child's wedding, and the couple themselves later a baby shower (sismooni), birthdays and anniversaries.

## 3.2 Repeat families

This group's main asset is the guest list. Building the family tree is the hardest part of the work, and the ability to reuse it is the main reason to come back to Payknameh.

- **Account-level guest book:** households and the group tree kept at the Organization level, with each event selecting from it.

- **Copy event:** create a new event based on a previous one, with the tree and households and without responses and tokens.

- **Privacy choice:** after the event, ask whether the guest book should be kept for future events or deleted.

- **Family collaboration:** mother, sister or aunt as EDITOR. In this group the real repeat user is often the "family guest-list keeper", not the couple.

- **Price:** prepaid credit (e.g. three events at a discount), or a significant discount for the second event.

## 3.3 Professionals (B2B)

This group is both a revenue customer and a distribution channel: a planner with 40 weddings a year means 40 couples and thousands of guests.

- **Multi-event dashboard:** in-progress events, deadlines and response rates in one view.

- **Team:** several staff with different access levels, based on Organization and EventMember.

- **Handover to the client:** the planner creates the event and invites the couple with a role between OWNER and EDITOR to enter the guest list.

- **Their own brand (co-branding):** the event service's brand instead of "Made with Payknameh", as a paid feature.

- **Bulk SMS and official invoices.**

- **Price:** annual subscription with an event cap, or bulk credit.

**Risk:** if the per-event price for planners is much lower than the couple's price, couples will ask planners to make the card for them. B2B's added value should lie more in features (dashboard, team, brand) than only in price.

## 3.4 Custom design (customization level 3)

Orders are taken with a standard brief form and assigned to freelance teams through the internal bidding process. This generates revenue from day one, without any code.

# 4. Event types and expansion order

The Event and Session model is generic and extends to other events after weddings without a redesign.

- **Family:** engagement, henna night (hanabandan), birthday, baby shower (sismooni), wedding anniversary, graduation.

- **Religious:** mowludi celebrations, sofreh and nazri (votive meals), Hajj walimah (welcome feast).

- **Memorial services (khatm/tarhim):** high volume but a completely different tone and needs: separate templates, no "Yes, definitely" response, no music, and no promotional branding on the card. If entered, design it separately and with sensitivity.

- **Corporate:** conferences, year-end parties, customer events; toward B2B.

## Proposed order

- **MVP:** weddings only, and only the one-time segment.

- **Right after:** wedding professionals (planners and event services). Same event type, only needs the multi-event dashboard, and at the same time becomes an acquisition channel for couples.

- **After that:** guest book and copy event for families, along with engagement and henna night, which are close to weddings.

- **Finally:** other event types and the corporate market.

# 5. Marketing and acquisition channels

The most important channels are wedding vendors and the guests themselves; both keep acquisition cost low.

- **Wedding vendors:** photographers and videographers, beauty salons, venues, wedding planners and wedding card print shops reach the couple before we do. Referral code with commission, or free cards for their clients. First pilot in Mashhad, bundled with the Mona Studio videography package.

- **Branding on the card:** "Made with Payknameh" with a soft CTA, e.g. "Have a wedding coming up? Build your guest list for free". Today's guests are next year's couples.

- **SEO and free tools:** content for searches like "wedding card text" and "wedding card poetry". Tools: card text generator (with classical poetry), family checklist, guest count and venue capacity calculator. Each one leads into building the guest tree.

- **Instagram and Reels on real pain:** competitors show pretty cards. We show the pain: a forgotten relative, not knowing the aqd headcount, "our card never arrived". A short comedic video, then a demo of the guest tree and session stats.

- **Pilots as proof:** measure the no-follow-up response rate of the first few events and turn it into marketing messaging.

- **Referral:** after the event, a gift code for the couple so a friend gets a free premium template. Weddings happen back-to-back within a friend circle.

- **Direct B2B sales:** demos for planners and event services focused on the multi-event dashboard and co-branding.

- **Seasonality:** campaigns in wedding season (after Muharram and Safar, spring and summer); in slow months, focus on SEO and recruiting partners.

To support pilots, set up a domestic messenger channel (Bale or Eitaa) alongside Telegram, and a short visual guide for older guests.

# 6. Financial log

Every movement of money is a new, non-editable record, with the gateway's raw response, so any discrepancy is traceable.

## 6.1 Principles

- **Amounts are always integers in rials** (bigint). Conversion to tomans only in the UI.

- **No financial record is deleted or edited.** A refund or manual discount is a new record; the same logic as RSVPEvent.

- **Idempotency:** each payment request has a unique key so a double click or double callback doesn't create two orders or two activations.

- **The gateway's raw response** is stored in full.

- **Separation from guest data:** an order only references eventId and userId. Deleting the guest list does not change financial records.

## 6.2 Entities

| **Entity** | **Role** |
| --- | --- |
| **Order** | Order: event, total amount, discount, status (PENDING, PAID, FAILED, REFUNDED) |
| **OrderItem** | Line item: premium template, branding removal, music, SMS pack, custom design, subscription |
| **PaymentAttempt** | Each trip to the gateway: gateway, authority, amount, tracking number, masked card |
| **PaymentEvent** | Append-only log: request, redirect, callback, verify, reverse, with raw response |
| **LedgerEntry** | Simple general ledger: payment, refund, gateway fee, partner commission |
| **Entitlement** | Active features per event or organization; the single source for paid-feature access checks |
| **SmsCreditLedger** | SMS credit top-ups and usage with segment count and the vendor's actual cost |
| **Refund** | Refund with reason, operator and reference to the original payment |
| **Coupon / ReferralCommission** | Discount codes, partner referral codes and payable commission |
| **Subscription** | B2B subscription: organization, period, event cap, renewal status |
| **Invoice** | Invoice with a unique sequential number and buyer info |
| **AdminAction** | Every manual admin action on financial data, with user and reason |

App code never checks order status directly; it only asks Entitlement. One-time payment, multi-event bundles, B2B subscriptions, referral gifts and manual support activation all go through this same path.

## 6.3 Payment flow

- Create Order with status PENDING and an idempotency key.

- Request to the gateway; record PaymentAttempt and the request event.

- Redirect the user to the gateway; record the redirect event.

- Receive the callback; store the raw response before any processing.

- Server-side verify, without trusting the return URL parameters.

- On success, a single database transaction: Order to PAID, record LedgerEntry and create Entitlement.

- If verify or step 6 fails: "needs review" state and an alert to the admin.

**Common problem:** money was deducted but verify didn't happen (internet outage, browser closed). Gateways behave differently in this case and it must be checked precisely for the chosen gateway. A periodic job queries the gateway API for orders that have been PENDING for a few minutes.

## 6.4 Daily reconciliation

A daily job compares the total of successful payments with the gateway's settlement report and reports any discrepancy, even at small scale.

## 6.5 SMS as a financial commodity

Each send records: number of segments (about 70 Persian characters per segment), vendor cost, amount deducted from credit, and delivery status. Credit for FAILED SMS is refunded automatically.

## 6.6 Invoices and tax

Electronic invoicing requirements (the Iranian tax "Moadian" system) and their thresholds must be reviewed with an accountant. Technically, the Invoice model is built from the start so later integration is simple. Financial records are retained per legal requirements, independent of guest data deletion.

# 7. Performance and app health log

All tools are self-hosted and monitoring runs from inside Iran, because an external monitor can't see domestic disruptions.

- **Structured logs:** JSON (e.g. pino) with a request-id on every request. The guest token in the /i/ route is masked, and names, phone numbers and personal messages are never logged.

- **Server metrics:** Prometheus and Grafana for CPU, memory, request count, error rate and per-route latency.

- **Tracing:** OpenTelemetry in Next.js to find the source of slowness (database, template rendering, object storage).

- **Database:** pg_stat_statements and slow query logging.

- **Guest Web Vitals:** LCP, INP and CLS via a beacon to our own endpoint; only anonymous metrics (device type, network type, timings), no token or household.

- **Errors:** self-hosted GlitchTip or Sentry, with a filter removing tokens and phone numbers from stack traces.

- **Uptime:** one probe on the domestic internet and one on the international internet.

- **Host audit log:** token rotation or revocation, INVITED to EXCLUDED changes, session deletion, time or venue changes.

- **OTP security:** alert on spikes in OTP requests (a sign of SMS pumping).

## SLOs and alerts

| **Metric** | **Why it matters** |
| --- | --- |
| **Guest page load time on mobile networks** | The first experience of hundreds of guests per event |
| **Response submission success rate** | Directly the product's primary success metric |
| **OTP delivery time** | Slowness here stops host signups |
| **Invitation SMS delivery rate** | Directly affects satisfaction and cost |
| **PENDING orders older than a few minutes** | Money deducted but features not activated |
| **Daily reconciliation discrepancy with the gateway** | Financial risk |

# 8. Product events and business dashboard

Product events are recorded in a first-party table named ProductEvent (name, eventId, organizationId, actorType, props, createdAt) and only from server-side domain services.

## 8.1 Main funnel

- otp_verified

- event_created

- session_created

- household_added

- household_invited

- invitation_published

- link_copied, shared or sms_sent

- guest_opened

- rsvp_submitted

- order_paid

**Activation definition:** invitation published, at least 10 households invited, and at least one guest response recorded.

## 8.2 Business dashboard

- Conversion rate from Activation to payment, and from publish to payment.

- Average revenue per event and the share of each item (template, branding removal, SMS, custom design).

- SMS margin.

- Refund rate and reasons.

- Revenue and commission per partner or referral code; which marketing channel actually brings money.

- Custom design orders: delivery time, delivering team, margin.

- Metrics per customer segment per the section 2 table.

- The MVP document's two primary metrics: response completion rate and response rate without follow-up.

# 9. Data model preparation and prioritization

Four small changes to the MVP data model keep the path open for all three customer segments without a redesign.

## 9.1 Data model changes

- **Organization.type:** personal or professional, to separate pricing and features.

- **Event.eventType:** with wedding as default.

- **Migration path for households to the Organization level:** for the guest book; only design it now, don't implement.

- **Entitlement:** built even in the MVP, and premium features for pilot events are activated through this same path.

## 9.2 Prioritization against MVP phases

| **When** | **What** |
| --- | --- |
| **Phase 1** | Structured logs, request-id, error monitoring, uptime from inside Iran, AdminAction, Organization.type and Event.eventType |
| **Phases 3 to 4** | ProductEvent and host funnel events, host audit log, Entitlement |
| **Phase 5** | Web Vitals and guest page SLOs |
| **Phase 7** | Delivery log and SMS cost |
| **After MVP, with the gateway** | The whole financial layer (section 6), business dashboard |
| **After validation** | B2B features, then guest book and copy event |

# 10. Open decisions

- [ ] Choose the payment gateway and check its behavior in the "money deducted but not verified" case

- [ ] Moadian system and electronic invoice requirements (with an accountant)

- [ ] Price of the one-time complete bundle, the multi-event bundle and the B2B subscription

- [ ] Retention period for operational logs and product events

- [ ] "Client" role for handing an event from planner to couple: a new role or the same EDITOR

- [ ] Bringing the EDITOR invite UI forward into the MVP for family collaboration

- [ ] Whether and when to enter memorial services

- [ ] Partner commission and referral code terms

- [ ] City and partners for the first pilot (proposal: Mashhad)
