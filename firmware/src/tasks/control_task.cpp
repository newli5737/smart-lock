#include "config.h"
#include "globals.h"


void vControlTask(void *pvParameters) {
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_RELAY, LOW); 
  digitalWrite(PIN_BUZZER, LOW);

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
        } else { 
          for (int i = 0; i < cmd.value; i++) {
            digitalWrite(PIN_BUZZER, HIGH);
            vTaskDelay(100 / portTICK_PERIOD_MS);
            digitalWrite(PIN_BUZZER, LOW);
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
