#include "config.h"
#include "globals.h"
#include <Keypad.h>
#include <Adafruit_Fingerprint.h>

// Initialize fingerprint sensor on Serial2
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

char keys[KEYPAD_ROWS][KEYPAD_COLS] = {{'1', '2', '3', 'A'},
                                       {'4', '5', '6', 'B'},
                                       {'7', '8', '9', 'C'},
                                       {'*', '0', '#', 'D'}};
byte rowPins[KEYPAD_ROWS] = {PIN_ROW1, PIN_ROW2, PIN_ROW3, PIN_ROW4};
byte colPins[KEYPAD_COLS] = {PIN_COL1, PIN_COL2, PIN_COL3, PIN_COL4};
Keypad keypad =
    Keypad(makeKeymap(keys), rowPins, colPins, KEYPAD_ROWS, KEYPAD_COLS);

// Enrollment state
bool enrollmentMode = false;
uint8_t enrollmentID = 0;
uint8_t enrollmentStep = 0; // 0: idle, 1: first scan, 2: remove finger, 3: second scan

uint8_t enrollFingerprint(uint8_t id);

void vInputTask(void *pvParameters) {

  // Initialize fingerprint sensor
  mySerial.begin(57600, SERIAL_8N1, PIN_FINGERPRINT_RX, PIN_FINGERPRINT_TX);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("FINGERPRINT:READY");
  } else {
    Serial.println("FINGERPRINT:ERROR");
  }

  String keyBuffer = "";
  unsigned long lastKeyTime = 0;

  for (;;) {
    // Handle enrollment mode
    if (enrollmentMode) {
      uint8_t result = enrollFingerprint(enrollmentID);
      if (result == FINGERPRINT_OK) {
        // Enrollment successful
        InputEvent evt;
        evt.type = EVENT_FINGERPRINT_DETECTED;
        sprintf(evt.data, "ENROLL_OK:%d", enrollmentID);
        xQueueSend(xInputQueue, &evt, portMAX_DELAY);
        
        enrollmentMode = false;
        enrollmentStep = 0;
        
        ControlCommand beepCmd;
        beepCmd.type = CMD_BEEP;
        beepCmd.value = 2;
        xQueueSend(xCommandQueue, &beepCmd, 0);
      } else if (result != 255) { // 255 means still in progress
        // Enrollment failed
        InputEvent evt;
        evt.type = EVENT_FINGERPRINT_DETECTED;
        sprintf(evt.data, "ENROLL_FAIL:%d", result);
        xQueueSend(xInputQueue, &evt, portMAX_DELAY);
        
        enrollmentMode = false;
        enrollmentStep = 0;
        
        ControlCommand beepCmd;
        beepCmd.type = CMD_BEEP;
        beepCmd.value = 1;
        xQueueSend(xCommandQueue, &beepCmd, 0);
      }
      vTaskDelay(100 / portTICK_PERIOD_MS);
      continue;
    }

    // Normal verification mode - Check for fingerprint
    uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      p = finger.image2Tz();
      if (p == FINGERPRINT_OK) {
        p = finger.fingerSearch();
        if (p == FINGERPRINT_OK) {
          // Fingerprint found
          InputEvent evt;
          evt.type = EVENT_FINGERPRINT_DETECTED;
          
          // Send fingerprint ID as data
          sprintf(evt.data, "%d", finger.fingerID);
          
          xQueueSend(xInputQueue, &evt, portMAX_DELAY);

          // Beep on successful scan
          ControlCommand beepCmd;
          beepCmd.type = CMD_BEEP;
          beepCmd.value = 1;
          xQueueSend(xCommandQueue, &beepCmd, 0);
        }
      }
    }

    // Keypad handling (unchanged)
    char key = keypad.getKey();
    if (key) {
      if (millis() - lastKeyTime > 5000) {
        keyBuffer = "";
      }
      lastKeyTime = millis();

      ControlCommand beepCmd;
      beepCmd.type = CMD_BEEP;
      beepCmd.value = 0; 
      xQueueSend(xCommandQueue, &beepCmd, 0);

      if (key == '#') {
        if (keyBuffer.length() > 0) {
          InputEvent evt;
          evt.type = EVENT_KEYPAD_SUBMIT;
          strcpy(evt.data, keyBuffer.c_str());
          xQueueSend(xInputQueue, &evt, portMAX_DELAY);
          keyBuffer = "";
        }
      } else if (key == 'C') { 
        keyBuffer = "";
      } else {
        keyBuffer += key;
      }
    }

    vTaskDelay(50 / portTICK_PERIOD_MS); 
  }
}

// Fingerprint enrollment function (based on AS608 example)
uint8_t enrollFingerprint(uint8_t id) {
  int p = -1;
  
  // Step 1: Get first image
  if (enrollmentStep == 0) {
    Serial.println("ENROLL:PLACE_FINGER");
    enrollmentStep = 1;
    return 255; // In progress
  }
  
  if (enrollmentStep == 1) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      return 255; // Still waiting
    }
    if (p != FINGERPRINT_OK) {
      return p; // Error
    }
    
    // Convert image
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    Serial.println("ENROLL:REMOVE_FINGER");
    enrollmentStep = 2;
    vTaskDelay(2000 / portTICK_PERIOD_MS);
    return 255;
  }
  
  // Step 2: Wait for finger removal
  if (enrollmentStep == 2) {
    p = finger.getImage();
    if (p != FINGERPRINT_NOFINGER) {
      return 255; // Still waiting for removal
    }
    Serial.println("ENROLL:PLACE_SAME_FINGER");
    enrollmentStep = 3;
    return 255;
  }
  
  // Step 3: Get second image
  if (enrollmentStep == 3) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      return 255; // Still waiting
    }
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    // Convert image
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    // Create model
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    // Store model
    p = finger.storeModel(id);
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    Serial.println("ENROLL:SUCCESS");
    return FINGERPRINT_OK;
  }
  
  return 255;
}
