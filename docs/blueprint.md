# **App Name**: Vtex Data Sync

## Core Features:

- Vtex Data Extraction: Extract product and sales data from Vtex platform using the provided API credentials. Uses a tool that can determine whether all of the requested data exists or only some.
- Data Transformation: Transform the extracted data into a format suitable for Google Sheets, handling any data type conversions.
- Google Sheets Integration: Authenticate and connect to Google Sheets using the Google Sheets API.
- Data Upload: Upload the transformed data into the specified Google Sheets spreadsheet, creating a new sheet if necessary.
- Schedule automation: Automate the synchronization daily at 2AM (UTC time).

## Style Guidelines:

- Primary color: HSL(210, 70%, 50%) - A moderate blue (#3399CC) to inspire trust and data focus.
- Background color: HSL(210, 20%, 98%) - A very light blue (#F9FBFC) to provide a clean and calm backdrop.
- Accent color: HSL(180, 60%, 40%) - A vivid cyan (#33CCCC) for interactive elements, reflecting efficiency and speed.
- Body and headline font: 'Inter', sans-serif, for clear data presentation and readability.
- Simple, line-based icons to represent data entities and actions, ensuring clarity and ease of understanding.
- Clean and structured layout to ensure efficient data display, adhering to best practices for data table design.
- Subtle transition animations when updating the Google sheet to signify successful data synchronization.