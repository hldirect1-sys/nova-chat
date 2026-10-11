# Nova specialist brains — saved 2026-10-10 (America/Los_Angeles)

## Delivered
- GitHub frontend: left-hand Nova, Tax Brain and Travel Brain tabs with glowing vector brain logo.
- Browser histories and backend conversation IDs are separate per specialist.
- Travel Brain: separate endpoint, API key, memory, cache, usage counters and search audit. Gemini runs travel chat; SerpAPI handles 19 registered search engines.
- Nova gateway routes verified owner sessions to specialists with server-only credentials. This is currently owner-workspace access, not a customer rollout.
- Latest Travel Brain repair: normalize hotel review-rating filters, validate hotel class and sorting, order same-timestamp user/assistant messages consistently, retain up to 20 conversation messages, preserve trip context and failed-tool receipts in the final response.

## Verification and limits
- Seven hotel-filter regression checks passed; Nova tab selection, routing and separate-history mock checks passed.
- Earlier live Gemini hotel reply, separate customer memory, calculator and core travel search tests passed.
- A live Barcelona package regression is pending at this snapshot; no claim of success until its receipt is inspected.
- Source frontend and logo built on GitHub Pages at commit a0767103ae6525126f17a8fff0b318f2eb9665c8.
- Branded HTTPS certificate was still failing validation at the last check. DNS CNAME, branded-origin CORS, auth redirect allowlist and client HTTPS redirect were verified. No signed-in browser chat verification was completed in this session.
- Search results do not make bookings. Prices and availability require provider confirmation.
- Not every registered engine has been tested live.
- Tax Brain models, training and company website were not changed by this travel implementation.

## Secrets
No API key or login is stored here. Credentials remain in private server environment/Vault and service-only RPCs.
