# Fulfillment CRM · Sheet 4

Dashboard for Sheet 4 of the fulfillment Google Sheet: a **Sheet Data** tab (editable offers table) and a **Summary** tab.

## Run it

```sh
npm install
npm start        # builds, then serves http://localhost:5173
npm run dev      # same port, with live reload while editing
```

Use `PORT=8080 npm start` to change the port. Requires Node 22.12+.

## How data flows today

- **Reading:** rows come live from the Google Sheet (it is shared by link). Each successful read is also saved to `data/sheet-snapshot.csv`, so if Google can't be reached the app shows that offline copy.
- **Writing:** edits are saved on this computer in `data/local-edits.json`, and uploaded quotation files go to `data/uploads/`. Nothing is written to the Google Sheet or Drive yet — that needs the service account (see below).
- **Offer ID → GL Admin:** GL Admin only allows embedding from `https://*.indiamart.com`, so on localhost it opens in a separate window; hosted under an `indiamart.com` https address it opens inside the dashboard.

To start from a clean slate, stop the server and delete `data/local-edits.json` and `data/uploads/`.

## Column mapping (Sheet 4)

| Dashboard | Sheet column |
|---|---|
| Priority | `Priority` |
| Worked tick | `Worked_flag` (1/0) + `Work_emp_name` (from "Your name") |
| Offer ID | `OFFER ID` |
| RAG · AST buy · Purchases | `RAG Sellers introduced` · `Astbuy` · `Purchases` (read only) |
| Interaction via LMS | `Interaction via LMS/Calls` (1/0) |
| Call | `Call Attempted` = 1 |
| Progress update | `Progress Update` |
| Comment | `Progress Update comments` |
| Fulfilled popup | `Fulfillment Flag` = 1, `Fulfillment Remarks`, `Quotations/Invoice` |

## Still to connect

Writing to the sheet and uploading quotations to Google Drive, using a service account key (`~/.config/fulfillment-crm/service-account.json`) shared on the sheet and on a Shared Drive folder.
