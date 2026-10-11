# Travel chat repair — 2026-10-10, 20:56 PDT

Deployment: travel-brain version 9.
Source commit: 8e84cdc3c7bca7d1f2bacfbe8c859d9461bf5f8f.

## Fixed
- Map decimal hotel review ratings to provider enums (4.5 -> rating 9).
- Reject invalid class/sorting filters before paid search.
- Preserve original trip context when the newest message is a short preference.
- Keep chronological user/assistant order when timestamps match.
- Retain failed tool receipts so search failures remain visible.

## Verified
- Seven deterministic hotel-filter checks passed.
- Nova sidebar selection, routing and separate history mock tests passed.
- A live two-person LAX/Barcelona November 4–11 regression with the follow-up “4.5 stars” returned HTTP 200, a nonempty Gemini reply, successful flight and hotel searches, and hotel evidence with rating code 9.
- Test provider AI cost: USD 0.013338.
- Keys stayed server-side. No Tax Brain model/training changes.

## Remaining limits
- This test verifies backend chat, not a signed-in browser session.
- Branded HTTPS certificate remained unresolved at the last domain check.
- Package planning must confirm hotel check-in against actual arrival dates: the sample overnight flight arrived November 5 while the requested hotel search started November 4. These are candidate search results, not a bookable/confirmed package.
- No booking occurred; provider prices, taxes/fees and room occupancy require confirmation.
