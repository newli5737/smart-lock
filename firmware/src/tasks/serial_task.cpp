#include "config.h"
#include "globals.h"
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>

// External fingerprint sensor object from input_task.cpp
extern Adafruit_Fingerprint finger;


void vSerialTask(void *pvParameters) {
  StaticJsonDocument<512> doc;
  String inputBuffer = "";

  for (;;) {
    if (Serial.available() > 0) {
      char c = Serial.read();
      if (c == '\n') {
        DeserializationError error = deserializeJson(doc, inputBuffer);
        if (!error) {
          const char *cmd = doc["cmd"];
          ControlCommand qCmd;
          memset(&qCmd, 0, sizeof(ControlCommand));

          if (strcmp(cmd, "unlock") == 0) {
            qCmd.type = CMD_UNLOCK;
            qCmd.value = doc["duration"] | 5;
            xQueueSend(xCommandQueue, &qCmd, portMAX_DELAY);

            ControlCommand dCmd;
            dCmd.type = CMD_UPDATE_DISPLAY;
            strcpy(dCmd.text, "DOOR UNLOCKED");
            xQueueSend(xDisplayQueue, &dCmd, 0);

          } else if (strcmp(cmd, "lock") == 0) {
            qCmd.type = CMD_LOCK;
            xQueueSend(xCommandQueue, &qCmd, portMAX_DELAY);

            ControlCommand dCmd;
            dCmd.type = CMD_UPDATE_DISPLAY;
            strcpy(dCmd.text, "DOOR LOCKED");
            xQueueSend(xDisplayQueue, &dCmd, 0);

          } else if (strcmp(cmd, "beep") == 0) {
            qCmd.type = CMD_BEEP;
            qCmd.value = doc["times"] | 1;
            xQueueSend(xCommandQueue, &qCmd, portMAX_DELAY);
          } else if (strcmp(cmd, "enroll_fingerprint") == 0) {
            extern bool enrollmentMode;
            extern uint8_t enrollmentID;
            extern uint8_t enrollmentStep;
            
            enrollmentID = doc["id"] | 1;
            enrollmentMode = true;
            enrollmentStep = 0;
            
            Serial.println("{\"status\":\"enrollment_started\"}");
          } else if (strcmp(cmd, "delete_fingerprint") == 0) {
            // Delete fingerprint from sensor
            uint8_t id = doc["id"] | 1;
            uint8_t result = finger.deleteModel(id);
            
            if (result == FINGERPRINT_OK) {
              Serial.print("{\"status\":\"fingerprint_deleted\",\"id\":");
              Serial.print(id);
              Serial.println("}");
              
              // Display on LCD
              ControlCommand dCmd;
              dCmd.type = CMD_UPDATE_DISPLAY;
              strcpy(dCmd.text, "Da xoa");
              xQueueSend(xDisplayQueue, &dCmd, 0);
            } else {
              Serial.print("{\"status\":\"delete_failed\",\"id\":");
              Serial.print(id);
              Serial.println("}");
            }
          } else if (strcmp(cmd, "list_fingerprints") == 0) {
            // List all fingerprints in sensor
            Serial.println("{\"status\":\"listing_fingerprints\"}");
            
            for (uint8_t id = 1; id <= 127; id++) {
              uint8_t result = finger.loadModel(id);
              if (result == FINGERPRINT_OK) {
                Serial.print("{\"fingerprint_found\":");
                Serial.print(id);
                Serial.println("}");
              }
              vTaskDelay(10 / portTICK_PERIOD_MS);
            }
            
            Serial.println("{\"status\":\"listing_complete\"}");
          } else if (strcmp(cmd, "clear_all_fingerprints") == 0) {
            // Clear all fingerprints from sensor
            uint8_t result = finger.emptyDatabase();
            
            if (result == FINGERPRINT_OK) {
              Serial.println("{\"status\":\"all_fingerprints_cleared\"}");
              
              // Display on LCD
              ControlCommand dCmd;
              dCmd.type = CMD_UPDATE_DISPLAY;
              strcpy(dCmd.text, "Da xoa tat ca");
              xQueueSend(xDisplayQueue, &dCmd, 0);
            } else {
              Serial.println("{\"status\":\"clear_failed\"}");
            }
          }
        } else {
        }
        inputBuffer = "";
      } else {
        inputBuffer += c;
      }
    }

    InputEvent evt;
    if (xQueueReceive(xInputQueue, &evt, 10 / portTICK_PERIOD_MS) == pdTRUE) {
      xSemaphoreTake(xSerialMutex, portMAX_DELAY);

      doc.clear();
      if (evt.type == EVENT_FINGERPRINT_DETECTED) {
        doc["type"] = "fingerprint";
        doc["id"] = evt.data;
      } else if (evt.type == EVENT_KEYPAD_SUBMIT) {
        doc["type"] = "keypad";
        doc["password"] = evt.data;
      }

      serializeJson(doc, Serial);
      Serial.println();

      xSemaphoreGive(xSerialMutex);
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}
