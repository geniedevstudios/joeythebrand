# JOEY THE BRAND · DHL Express demo and delivery audit

**Rehearsed on 11 November 2026.** The storefront and admin both send Accra, Ghana as the shipper origin. The invitation from DHL Nigeria asks for shipments within Nigeria and from Nigeria to another country. Confirm the scope with DHL before presenting the Ghana results as meeting evidence.

## Before the call

Send this to the team that issued the invite.

> Hi DHL team, thanks for arranging the production-readiness demo. JOEY THE BRAND currently dispatches from Accra, Ghana. Our sandbox rehearsal covered Accra to London and Accra to Kumasi. Your invitation lists domestic Nigeria and exports from Nigeria. Could you confirm which origin and shipping account you want us to demonstrate, and whether the Ghana onboarding team should join? Our within-Ghana checkout offers DHL Express Domestic where available alongside Local Courier. We can demonstrate the Ghana domestic rate and label from the same checkout and admin flow. Please also let us know if pickup or tracking is in scope.

If DHL confirms **Ghana**, rehearse both storefront DHL flows and show Local Courier as the Ghana fallback. If DHL requires **Nigeria**, get the approved Nigerian shipper address, test account, contact, domestic destination, and export destination from DHL. The app currently has no Nigeria-origin configuration. A shipment from Accra to Lagos would be a Ghana export.

### Set up the rehearsal

1. Use a staging Supabase project shared by both apps, with the repository migrations applied. Create a test shopper, a test admin in `admin_operator_emails`, and a published, in-stock Ready to Wear item with verified product weight and HS code. Use a 0.5 kg package and 30 × 20 × 10 cm to match the rehearsal inputs. Measure the final packed weight and dimensions for operational shipments.
2. Set the staging `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and server-only `SUPABASE_SERVICE_ROLE_KEY` in both apps. Add `DHL_API_KEY`, `DHL_API_SECRET`, `DHL_ACCOUNT_NUMBER` and `DHL_API_BASE_URL=https://express.api.dhl.com/mydhlapi/test` to both apps. Use replacement sandbox credentials once DHL rotates the secret that was pasted into chat. In Next.js `.env.local` files, write a literal dollar sign in a secret as `\$` and keep the secret quoted if it contains `#`. Restart or redeploy both apps when you change the configuration. [Next.js environment variable syntax](https://nextjs.org/docs/pages/guides/environment-variables#referencing-other-variables) The local env files found in the main checkout did not have DHL settings.
3. For an actual Paystack test-mode rehearsal, put the staging `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` in the storefront, with the `pk_test_` and `sk_test_` prefixes. The values found in the main checkout did not have recognized Paystack mode prefixes. Use a documented test card and a controlled email inbox. Add a staging Resend key if you plan to show confirmations. A prepared paid staging order gives you a fallback if the payment popup or network stalls. [Paystack test payment details](https://paystack.com/docs/payments/test-payments/)
4. From `joey-app`, run `npm ci` and `npm run dev`. From `joey-admin`, run the same commands in a separate terminal. The defaults are `http://localhost:3000` for the storefront and `http://localhost:3001/orders` for admin. Sign in to each app and open the product, checkout and admin Orders tabs. Admin uses an in-memory session, so refreshing or opening a new tab can require signing in again. Keep a separate paid, packaged test order without a DHL tracking number and a previously generated test label ready.
5. Share only the browser window with test data. Keep the env files, authorization headers, customer records and DHL account number out of the screen share. DHL test PDFs can include account details. Use the label page with any private fields covered, or show the PDF locally after checking the page contents.

DHL separates test and production environments. The official MyDHL REST documentation covers account rates, shipment creation and labels, pickup and tracking. [MyDHL API documentation](https://developer.dhl.com/api-reference/mydhl-api-dhl-express)

## What to show in Teams

### 0:00–1:00 · Confirm the routes

Say “Joey dispatches from Accra. Checkout requests Express Domestic for delivery within Ghana and Express Worldwide for delivery abroad. For either DHL option, an authorized admin generates the label after payment and packing. Ghana customers can also choose Local Courier.”

### 1:00–5:00 · International storefront checkout

1. In **Shop**, pick the test item and add it to the bag. Open **Checkout** while signed in to the test shopper.
2. Choose **Outside Ghana**. Enter synthetic customer details and a test address. The sandbox probe used Westminster, London, Greater London, `SW1A 1AA`, United Kingdom of Great Britain and Northern Ireland. Use DHL-provided test details if they give you a different case.
3. Wait for the DHL option to show a GHS amount. Point out that the storefront server sends shipper and destination details, parcel weight and dimensions, and requests the account's rates. It selects **Express Worldwide** (product `P`) and requires a valid GHS price. Select **DHL** explicitly. **Custom Shipping** is initially selected and the rate may vary with the date, weight and route.
4. Point out the updated total. Use **Card** and complete the payment in Paystack Test Mode. The server verifies the payment reference and GHS amount before the order can move into fulfillment. Copy the order number. If the payment service stalls, move to the prepared order and identify it as a test order created earlier.

### 5:00–8:00 · Admin label generation

1. Open **Admin → Orders**. Find the same order and verify the payment is **Paid**. Use the status dropdown to select **Order Packaged** after the item is ready. An unpaid order or stock-conflict hold cannot create a label.
2. Select **Create DHL Shipment**, enter the packed dimensions in centimeters, then choose **Generate Label** once. Joey sends the recipient details, parcel data, product and customs information to DHL's shipment endpoint. The API returns an air waybill number and a PDF.
3. Point out the tracking number and **Download Label**. Open the PDF and check the recipient route, waybill, barcode and documents. In the tested checkout, label creation requests no pickup. Joey's order status currently changes to `shipped` at label creation and records DHL status as **Manifested**. Actual collection is a separate event.
4. If DHL asks for pickup, explain the **Schedule Pickup** button and show the separate request. Only run a pickup if that is agreed and the environment is the sandbox. This rehearsal covered pickup with a simulated response. If the shipment request times out, reconcile against DHL by the test order reference before retrying.

### 8:00–11:00 · Within Ghana

1. In a fresh checkout, choose **Within Ghana**. Enter synthetic customer details and **Adum**, **Kumasi**, **Ashanti**. Wait for **DHL Express Domestic** to show a GHS price. Show **Local Courier** as the other option. Its fee stays **TBD** and your team confirms the fee and delivery timing after checkout.
2. Select **DHL Express Domestic** to add the delivery fee to the order total. Complete the test payment and copy the order number.
3. In **Admin → Orders**, find the paid Ghana order. Choose **Order Packaged → Create DHL Shipment → Generate Label**. Download the one-page PDF and show the waybill. This route uses product `N` and sends the parcel as non-customs-declarable. Open **Account → Show timeline** for the customer view once the waybill is saved.
4. Ask DHL to confirm account and origin eligibility, domestic and export product codes, billing currency, accepted Ghana postal format, customs requirements, and whether they need another test before issuing production access.

## How orders move through Joey

| Path | Checkout and payment | Admin and customer tracking |
|---|---|---|
| **Within Ghana · DHL** | Customer supplies contact, street, city and region. Checkout requests Express Domestic from Accra and adds the available GHS quote to the order total when the customer chooses DHL. The server requotes using catalog weights. | Paid, packaged orders generate a DHL waybill and PDF label without an export invoice. Pickup is separate. The customer can open the DHL timeline in Account. |
| **Within Ghana · Local Courier** | Delivery is TBD and the merchandise is paid in GHS. This option stays available if DHL cannot quote the address. | Staff confirm the fee and timing, hand off to the chosen courier outside Joey, and record the actual milestones in Orders. Account shows a local timeline driven by admin updates. |
| **Outside Ghana · DHL** | Country, city, street, state/province and a postal code where applicable. The app attempts DHL address validation, requests a rate, and adds DHL shipping to the amount due in GHS. The server recalculates shipping using catalog weights before initiating Paystack. | Paid, packaged orders can generate a PDF and waybill. Pickup is a separate admin action. The customer can open the DHL timeline under Account once a waybill is present. |
| **Outside Ghana · Custom Shipping** | The shopper can choose Custom Shipping or continue with it when DHL cannot return a quote. Shipping is TBD and the merchandise is paid in GHS. | Staff arrange delivery and confirm the fee separately. The customer account can remain on **Awaiting Tracking** because this path has no integrated carrier. |

All four paths resolve the item and price server-side. For physical stock the server reserves the SKU during checkout. Payment callback and signed webhook share reconciliation logic. If a late payment arrives after the reservation expired and stock is unavailable, the order can enter **Paid — Requires Resolution**. Resolve the order before fulfillment. Made-to-order items follow their production lead time. Use Ready to Wear on the call to keep the focus on shipping.

The code paths for checkout, fulfillment, and tracking are below.

- [Storefront checkout](../joey-app/src/app/checkout/CheckoutClient.tsx) → [DHL rates](../joey-app/src/app/api/shipping/rates/route.ts) → [order creation and reservation](../joey-app/src/lib/orderWorkflow.ts) → [payment verification](../joey-app/src/app/api/paystack/verify-order/route.ts).
- [Admin Orders](../joey-admin/src/app/orders/page.tsx) → [shipment route](../joey-admin/src/app/api/dhl/create-shipment/route.ts) → [DHL shipment and pickup payloads](../joey-admin/src/lib/dhl.ts).
- [Customer account timelines](../joey-app/src/app/account/AccountClient.tsx) and [DHL status webhook](../supabase/functions/dhl-webhook/index.ts).

## Sandbox results

| Scenario | Rate | Shipment result |
|---|---|---|
| Accra → London | DHL HTTP 200. Express Worldwide `P`, **GHS 467.14** pickup-local equivalent. The same response listed **USD 38.91** billing currency. | DHL HTTP 201. Sandbox AWB `9090266496`. PDF parsed successfully, 3 pages with shipping documents. This used the international payload from Joey's admin integration. |
| Accra → Kumasi | DHL HTTP 200. Express Domestic `N`, **GHS 83.68** pickup-local equivalent. The original test also returned **USD 6.96** as the billing currency. | DHL HTTP 201. Sandbox AWB `9090526174`. The updated storefront rate client and admin shipment client returned the quote and one-page PDF directly. |
| Within Nigeria and Nigeria export | Pending DHL confirmation and Nigeria-origin test setup. | Pending. |

Both rates used one 0.5 kg parcel with dimensions 30 × 20 × 10 cm. These are account-specific sandbox responses. Both shipments were sandbox transactions with pickup disabled. No production shipment, customer charge, or real pickup was created. The DHL samples establish that the API returned documents. A sample label does not establish production approval or delivery.

## Local browser results

The local Next.js apps ran against simulated Supabase, Paystack and DHL services with synthetic users and a GHS 350 test item. The Ghana Local Courier and international Custom Shipping orders each paid GHS 350. The Ghana DHL order added GHS 83.68 and reconciled GHS 433.68. The international DHL order added GHS 467.14 and reconciled GHS 817.14. The browser discarded the stale Ghana quote after the city changed and kept Local Courier available when DHL returned no service. A USD-only international response was rejected.

An admin recorded local courier milestones, generated domestic and international labels from paid packaged orders, and booked simulated pickups. The domestic request preserved the street address and sent only the label, with no export declaration or commercial invoice. The customer opened the Local Courier, DHL Domestic and DHL Worldwide timelines in Account. The shipment route rejected an unauthorized shopper, an unpackaged order, invalid carton dimensions and a duplicate label request. Both apps passed TypeScript checks.

The browser rehearsal exercised the app's payment verification and order handling. It did not verify a real Paystack test payment, database migration or row-level policy, email delivery, or the DHL push webhook. Repeat the rehearsal against the staging integrations before relying on a live walkthrough.

## Findings and release gates

| Priority | Finding | Close it by |
|---|---|---|
| **Before the meeting** | The invite and integration disagree about the origin. The updated worktree supports both domestic and international DHL for shipments originating in Ghana. | Get the review team to confirm the route and account in writing. Use the two Ghana artifacts only if that is the agreed scope. |
| **Before the meeting** | The original admin only showed the PDF after pickup. Checkout could take a non-GHS rate as GHS and round away pesewas. Payment verification also initialized Resend before reconciling payment. | The worktree now shows the PDF on label creation, validates the PDF and tracking response, selects a valid GHS Express Worldwide rate, preserves pesewas and carries the street into the server quote. Email sending starts after reconciliation, and the order success screen points to Account. Use this version in the demo. |
| **Before going live** | Test and production settings are controlled separately in the two apps, with the DHL test base as the code default. Both apps hard-code the Accra sender. | Confirm the account's approved ship-from address, test and live credentials, billing currency and payer. Configure both deployments together, confirm staging uses test settings, and use a private first live verification with DHL approval. Rotate the shared sandbox secret. |
| **Before going live** | Quotes use a standard carton. International quotes also use a fixed customs quote value. Label dimensions can be entered separately and the code sums item weight. The shipment route substitutes 0.5 kg and a generic HS code when product data is missing. The street, city, country and postal code used for DHL are preserved in the order’s shipping address metadata. | Use verified product weights and HS codes, actual carton weight and dimensions, correct origin and customs values, and verify when a structured province field is required for exports. Verify Ghana postal handling with DHL. Confirm how DAP duties and taxes are disclosed and how the shop handles any variance between the checkout quote and DHL's invoice. |
| **Before going live** | Checkout refreshes the quote after the address or cart changes and discards stale responses. The server also requotes at order creation. If the carrier changes the rate between those requests, the new total can differ from the last amount shown on the page. | Ask the shopper to confirm a changed total before opening Paystack. |
| **Before going live** | A tracking number blocks an ordinary second label attempt, but simultaneous requests or a DHL success followed by a database failure can still leave duplicate or unmatched shipments. Pickup has a similar reconciliation gap. | Persist a booking claim and provider reference so retries are safe, and create a process for matching an ambiguous response to a DHL shipment before retrying. The worktree removes automatic HTTP retries for creating shipments and pickups. |
| **Before enabling automated tracking** | The DHL webhook expects a sample payload and only verifies a signature when its secret exists. Status mapping and event ordering are provisional. Admin also marks the order shipped when the label is created. | Confirm the DHL push product, signature scheme and real event examples. Require verified authentication, deduplicate and order events, and model label created, collected and delivered separately. Confirm tracking data exposure and rate limits before opening the workflow to production traffic. |
| **Before going live in Ghana** | DHL Express Domestic and Local Courier are offered side by side. Ghana checkout collects street, city and region, and the integration uses the Ghana postal fallback tested with DHL. | Confirm domestic account coverage and postal handling. Agree Local Courier fees, who collects payment, whether customers should add GhanaPost GPS or landmarks in the order notes, and how staff record proof of delivery. |
| **Before promising delivery estimates** | The policy describes the two Ghana options and the local fee follow-up. International delivery can also fall back to Custom Shipping. | Align the policy, checkout and support instructions with the actual local rates and carrier coverage once decided. |

### Quick troubleshooting

- **No DHL option** · Both apps need the same intended DHL environment. The storefront renders DHL only when its server sees the key, secret and account number. Restart after changing env values.
- **DHL appears but there is no quote** · Check country, city, street, postal code, test-account origin and whether the response includes Express Domestic for Ghana or Express Worldwide for international shipping, priced in GHS. Use Local Courier in Ghana or Custom Shipping internationally if the route remains unavailable. A successful address-validation route response alone is insufficient because the helper can fall back when DHL validation is unavailable.
- **No Create DHL Shipment button** · Confirm the order used DHL at checkout and has no tracking number. Check the paid state, hold status and **Order Packaged** state. Make sure the signed-in admin email is allowlisted.
- **Label error or timeout** · Check DHL for the order reference before a second attempt. Use the prepared label as the meeting backup.
- **No tracking scans** · A sandbox waybill may have no scan history. Show the number and explain how scans populate the customer's timeline after carrier collection.
