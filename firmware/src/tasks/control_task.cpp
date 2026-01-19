#include "config.h"
#include "globals.h"


void vControlTask(void *pvParameters) {
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_RELAY, LOW); 
  digitalWrite(PIN_BUZZER, LOW); 
  digitalWrite(PIN_LED, LOW);    

  ControlCommand cmd;
  bool isUnlocked = false;
  unsigned long unlockTime = 0;
  unsigned long autoLockDuration = 0;

  for (;;) {
    if (xQueueReceive(xCommandQueue, &cmd, 10 / portTICK_PERIOD_MS) == pdTRUE) {
      switch (cmd.type) {
      case CMD_UNLOCK:
        digitalWrite(PIN_RELAY, HIGH);
        isUnlocked = true;
        unlockTime = millis();
        autoLockDuration = cmd.value * 1000;
        break;
      case CMD_LOCK:
        digitalWrite(PIN_RELAY, LOW);
        isUnlocked = false;
        break;
      case CMD_BEEP:
        if (cmd.value == 0) { 
          digitalWrite(PIN_BUZZER, HIGH); 
          vTaskDelay(50 / portTICK_PERIOD_MS);
          digitalWrite(PIN_BUZZER, LOW);  
        } else if (cmd.value > 0) {
          for (int i = 0; i < cmd.value; i++) {
            digitalWrite(PIN_BUZZER, HIGH); 
            vTaskDelay(100 / portTICK_PERIOD_MS);
            digitalWrite(PIN_BUZZER, LOW);  
            vTaskDelay(100 / portTICK_PERIOD_MS);
          }
        } else {
          int count = -cmd.value;
          for (int i = 0; i < count; i++) {
            digitalWrite(PIN_BUZZER, HIGH); 
            vTaskDelay(300 / portTICK_PERIOD_MS); 
            digitalWrite(PIN_BUZZER, LOW);  
            vTaskDelay(200 / portTICK_PERIOD_MS);
          }
        }
        break;
      case CMD_LED:
        // LED control: value 0=off, 1=on, 2=slow blink, 3=fast blink
        if (cmd.value == 0) {
          digitalWrite(PIN_LED, LOW);
        } else if (cmd.value == 1) {
          digitalWrite(PIN_LED, HIGH);
        } else if (cmd.value == 2) {
          for (int i = 0; i < 3; i++) {
            digitalWrite(PIN_LED, HIGH);
            vTaskDelay(200 / portTICK_PERIOD_MS);
            digitalWrite(PIN_LED, LOW);
            vTaskDelay(200 / portTICK_PERIOD_MS);
          }
        } else if (cmd.value == 3) {
          for (int i = 0; i < 5; i++) {
            digitalWrite(PIN_LED, HIGH);
            vTaskDelay(100 / portTICK_PERIOD_MS);
            digitalWrite(PIN_LED, LOW);
            vTaskDelay(100 / portTICK_PERIOD_MS);
          }
        }
        break;
      default:
        break;
      }
    }

    if (isUnlocked && (millis() - unlockTime > autoLockDuration)) {
      digitalWrite(PIN_RELAY, LOW);
      isUnlocked = false;

      ControlCommand dCmd;
      dCmd.type = CMD_UPDATE_DISPLAY;
      strcpy(dCmd.text, "DOOR LOCKED");
      xQueueSend(xDisplayQueue, &dCmd, 0);
    }
  }
}
