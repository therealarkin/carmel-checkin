/**
 * Google Apps Script for Carmel Daily Check-In
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com and create a new project
 * 2. Copy this entire file into the script editor
 * 3. Save the project (give it a name like "Carmel Check-In Backend")
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": "Me"
 * 7. Set "Who has access": "Anyone"
 * 8. Click "Deploy" and authorize when prompted
 * 9. Copy the Web app URL and paste it into the app's Settings
 * 
 * The sheet will be auto-created on first data submission.
 */

// Configuration
const SHEET_NAME = 'Check-In Data';
const SPREADSHEET_ID = ''; // Leave empty to auto-create, or paste an existing spreadsheet ID

/**
 * Handle POST requests from the check-in app
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Handle test ping
    if (data.test) {
      return createResponse({ success: true, message: 'Connection successful!' });
    }
    
    // Save the check-in data
    const result = saveCheckIn(data);
    return createResponse(result);
    
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse({ success: false, error: error.message });
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return createResponse({ 
    success: true, 
    message: 'Carmel Check-In API is running',
    timestamp: new Date().toISOString()
  });
}

/**
 * Save check-in data to the spreadsheet
 */
function saveCheckIn(data) {
  const sheet = getOrCreateSheet();
  
  // Extract data
  const responses = data.responses || {};
  
  // Format row
  const row = [
    data.date || new Date().toISOString().split('T')[0],
    data.timestamp || new Date().toISOString(),
    responses.overall_day || '',
    responses.academic_focus || '',
    formatSocialResponse(responses.social_interactions),
    responses.dysregulation_count !== undefined ? responses.dysregulation_count : '',
    formatCopingResponse(responses.used_coping_strategy),
    responses.free_response || '',
    data.id || '',
    data.metadata?.completion_time_seconds || '',
    data.metadata?.device || ''
  ];
  
  // Append row to sheet
  sheet.appendRow(row);
  
  return { 
    success: true, 
    message: 'Check-in saved successfully',
    entryId: data.id
  };
}

/**
 * Get or create the data sheet
 */
function getOrCreateSheet() {
  let spreadsheet;
  
  if (SPREADSHEET_ID) {
    // Use existing spreadsheet
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    // Create or get spreadsheet in script owner's Drive
    const files = DriveApp.getFilesByName('Carmel Daily Check-In Data');
    
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create('Carmel Daily Check-In Data');
      setupNewSpreadsheet(spreadsheet);
    }
  }
  
  // Get or create the data sheet
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    setupSheetHeaders(sheet);
  }
  
  return sheet;
}

/**
 * Set up a new spreadsheet with formatting
 */
function setupNewSpreadsheet(spreadsheet) {
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName(SHEET_NAME);
  setupSheetHeaders(sheet);
  
  // Create a summary sheet
  const summarySheet = spreadsheet.insertSheet('Weekly Summary');
  setupSummarySheet(summarySheet);
}

/**
 * Set up headers for the data sheet
 */
function setupSheetHeaders(sheet) {
  const headers = [
    'Date',
    'Timestamp',
    'Overall Day (1-5)',
    'Academic Focus (1-5)',
    'Social Interactions',
    'Dysregulation Count',
    'Coping Strategy Used',
    'Notes',
    'Entry ID',
    'Completion Time (sec)',
    'Device'
  ];
  
  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a5568');
  headerRange.setFontColor('#ffffff');
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // Date
  sheet.setColumnWidth(2, 180);  // Timestamp
  sheet.setColumnWidth(3, 120);  // Overall
  sheet.setColumnWidth(4, 120);  // Focus
  sheet.setColumnWidth(5, 200);  // Social
  sheet.setColumnWidth(6, 120);  // Dysreg
  sheet.setColumnWidth(7, 180);  // Coping
  sheet.setColumnWidth(8, 300);  // Notes
  sheet.setColumnWidth(9, 200);  // Entry ID
  sheet.setColumnWidth(10, 120); // Time
  sheet.setColumnWidth(11, 80);  // Device
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

/**
 * Set up the weekly summary sheet with formulas
 */
function setupSummarySheet(sheet) {
  // Title
  sheet.getRange('A1').setValue('Weekly Summary');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold');
  
  // Instructions
  sheet.getRange('A3').setValue('This sheet will auto-calculate weekly averages from the Check-In Data sheet.');
  sheet.getRange('A4').setValue('Add conditional formatting and charts as desired.');
  
  // Example formulas (users can customize)
  sheet.getRange('A6').setValue('Average Overall Day (last 7 entries):');
  sheet.getRange('B6').setFormula('=IFERROR(AVERAGE(INDIRECT("\'Check-In Data\'!C2:C" & COUNTA(\'Check-In Data\'!C:C))), "No data")');
  
  sheet.getRange('A7').setValue('Average Focus (last 7 entries):');
  sheet.getRange('B7').setFormula('=IFERROR(AVERAGE(INDIRECT("\'Check-In Data\'!D2:D" & COUNTA(\'Check-In Data\'!D:D))), "No data")');
  
  sheet.getRange('A8').setValue('Total Dysregulation Events:');
  sheet.getRange('B8').setFormula('=IFERROR(SUM(\'Check-In Data\'!F:F), 0)');
  
  sheet.getRange('A9').setValue('Total Check-Ins:');
  sheet.getRange('B9').setFormula('=MAX(COUNTA(\'Check-In Data\'!A:A)-1, 0)');
}

/**
 * Format social response for display
 */
function formatSocialResponse(value) {
  const map = {
    'yes_several': 'Yes, several good moments',
    'yes_one': 'Yes, at least one',
    'not_really': 'Not really, but okay',
    'no_wished': 'No, and wished I had'
  };
  return map[value] || value || '';
}

/**
 * Format coping response for display
 */
function formatCopingResponse(value) {
  const map = {
    'yes_helped': 'Yes, and it helped',
    'yes_not_much': 'Yes, but not much',
    'no': 'No',
    'n/a': 'N/A'
  };
  return map[value] || value || '';
}

/**
 * Create a JSON response
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utility function to test the script manually
 * Run this from the script editor to verify setup
 */
function testSetup() {
  const sheet = getOrCreateSheet();
  Logger.log('Sheet name: ' + sheet.getName());
  Logger.log('Spreadsheet URL: ' + sheet.getParent().getUrl());
  Logger.log('Setup complete!');
}
