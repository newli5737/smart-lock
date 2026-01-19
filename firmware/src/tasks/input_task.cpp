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

bool enrollmentMode = false;
uint8_t enrollmentID = 0;
uint8_t enrollmentStep = 0; // 0: idle, 1: first scan, 2: remove finger, 3: second scan

uint8_t enrollFingerprint(uint8_t id);

void vInputTask(void *pvParameters) {

  mySerial.begin(57600, SERIAL_8N1, PIN_FINGERPRINT_RX, PIN_FINGERPRINT_TX);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("FINGERPRINT:READY");
  } else {
    Serial.println("FINGERPRINT:ERROR");
  }

  String keyBuffer = "";
  unsigned long lastKeyTime = 0;
  unsigned long lastFingerprintTime = 0; // Cooldown timer

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
        
        // Display success message
        ControlCommand dCmd;
        dCmd.type = CMD_UPDATE_DISPLAY;
        strcpy(dCmd.text, "Thanh cong!");
        xQueueSend(xDisplayQueue, &dCmd, 0);
        
        ControlCommand beepCmd;
        beepCmd.type = CMD_BEEP;
        beepCmd.value = 2;
        xQueueSend(xCommandQueue, &beepCmd, 0);
      } else if (result != 255) { 
        // Enrollment failed
        InputEvent evt;
        evt.type = EVENT_FINGERPRINT_DETECTED;
        sprintf(evt.data, "ENROLL_FAIL:%d", result);
        xQueueSend(xInputQueue, &evt, portMAX_DELAY);
        
        enrollmentMode = false;
        enrollmentStep = 0;
        
        // Display error message
        ControlCommand dCmd;
        dCmd.type = CMD_UPDATE_DISPLAY;
        strcpy(dCmd.text, "Loi dang ky!");
        xQueueSend(xDisplayQueue, &dCmd, 0);
        
        ControlCommand beepCmd;
        beepCmd.type = CMD_BEEP;
        beepCmd.value = 1;
        xQueueSend(xCommandQueue, &beepCmd, 0);
      }
      vTaskDelay(100 / portTICK_PERIOD_MS);
      continue;
    }

    // Fingerprint cooldown check
    if (millis() - lastFingerprintTime > 1000) { // 1 second cooldown
      uint8_t p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      p = finger.image2Tz();
      if (p == FINGERPRINT_OK) {
        p = finger.fingerSearch();
        if (p == FINGERPRINT_OK) {
          InputEvent evt;
          evt.type = EVENT_FINGERPRINT_DETECTED;
          
          // Send fingerprint ID as data
          sprintf(evt.data, "%d", finger.fingerID);
          
          xQueueSend(xInputQueue, &evt, portMAX_DELAY);

          ControlCommand beepCmd;
          beepCmd.type = CMD_BEEP;
          beepCmd.value = 2; 
          xQueueSend(xCommandQueue, &beepCmd, 0);
          
          // Display Valid
          ControlCommand dCmd;
          dCmd.type = CMD_UPDATE_DISPLAY;
          strcpy(dCmd.text, "Van tay hop le");
          xQueueSend(xDisplayQueue, &dCmd, 0);

          lastFingerprintTime = millis(); // Reset cooldown

          ControlCommand ledCmd;
          ledCmd.type = CMD_LED;
          ledCmd.value = 2; 
          xQueueSend(xCommandQueue, &ledCmd, 0);
        } else if (p == FINGERPRINT_NOTFOUND) {
          ControlCommand beepCmd;
          beepCmd.type = CMD_BEEP;
          beepCmd.value = -3; 
          xQueueSend(xCommandQueue, &beepCmd, 0);
          
          // Display Invalid
          ControlCommand dCmd;
          dCmd.type = CMD_UPDATE_DISPLAY;
          strcpy(dCmd.text, "Khong hop le");
          xQueueSend(xDisplayQueue, &dCmd, 0);

          lastFingerprintTime = millis(); // Reset cooldown

          ControlCommand ledCmd;
          ledCmd.type = CMD_LED;
          ledCmd.value = 1; // Red LED ON (assuming 1 is ON/Red)
          xQueueSend(xCommandQueue, &ledCmd, 0);
        }
      }
    }
  }

    char key = keypad.getKey();
    if (key) {
      Serial.print("KEYPAD:");
      Serial.println(key);
      
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
          Serial.print("KEYPAD_SUBMIT:");
          Serial.println(keyBuffer.c_str());
          
          InputEvent evt;
          evt.type = EVENT_KEYPAD_SUBMIT;
          strcpy(evt.data, keyBuffer.c_str());
          xQueueSend(xInputQueue, &evt, portMAX_DELAY);
          keyBuffer = "";
        }
      } else if (key == 'C') { 
        Serial.println("KEYPAD_CLEAR");
        keyBuffer = "";
      } else {
        keyBuffer += key;
        Serial.print("KEYPAD_BUFFER:");
        Serial.println(keyBuffer.c_str());
        
        // Show masked password on LCD
        String masked = "";
        for(int i=0; i<keyBuffer.length(); i++) masked += "*";
        
        ControlCommand dCmd;
        dCmd.type = CMD_UPDATE_DISPLAY;
        // Limit length to avoid overflow
        strncpy(dCmd.text, masked.c_str(), 16);
        dCmd.text[16] = 0; // Ensure null termination
        xQueueSend(xDisplayQueue, &dCmd, 0);
      }
    }

    vTaskDelay(50 / portTICK_PERIOD_MS); 
  }
}

uint8_t enrollFingerprint(uint8_t id) {
  int p = -1;
  
  if (enrollmentStep == 0) {
    Serial.println("{\"status\":\"place_finger\"}");
    
    // Display on LCD
    ControlCommand dCmd;
    dCmd.type = CMD_UPDATE_DISPLAY;
    strcpy(dCmd.text, "Dat ngon tay...");
    xQueueSend(xDisplayQueue, &dCmd, 0);
    
    enrollmentStep = 1;
    return 255; 
  }
  
  if (enrollmentStep == 1) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      return 255; 
    }
    if (p != FINGERPRINT_OK) {
      return p; 
    }
    
    p = finger.image2Tz(1);
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    Serial.println("{\"status\":\"remove_finger\"}");
    
    // Display on LCD
    ControlCommand dCmd;
    dCmd.type = CMD_UPDATE_DISPLAY;
    strcpy(dCmd.text, "Nha tay ra");
    xQueueSend(xDisplayQueue, &dCmd, 0);
    
    enrollmentStep = 2;
    vTaskDelay(2000 / portTICK_PERIOD_MS);
    return 255;
  }
  
  if (enrollmentStep == 2) {
    p = finger.getImage();
    if (p != FINGERPRINT_NOFINGER) {
      return 255; 
    }
    Serial.println("{\"status\":\"place_again\"}");
    
    // Display on LCD
    ControlCommand dCmd;
    dCmd.type = CMD_UPDATE_DISPLAY;
    strcpy(dCmd.text, "Dat lai...");
    xQueueSend(xDisplayQueue, &dCmd, 0);
    
    enrollmentStep = 3;
    return 255;
  }
  
  if (enrollmentStep == 3) {
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) {
      return 255; 
    }
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    p = finger.image2Tz(2);
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    p = finger.createModel();
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    p = finger.storeModel(id);
    if (p != FINGERPRINT_OK) {
      return p;
    }
    
    Serial.println("ENROLL:SUCCESS");
    return FINGERPRINT_OK;
  }
  
  return 255;
}
