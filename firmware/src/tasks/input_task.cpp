#include "config.h"
#include "globals.h"
#include <Keypad.h>
#include <MFRC522.h>
#include <SPI.h>


MFRC522 rfid(PIN_RFID_SDA, PIN_RFID_RST);

char keys[KEYPAD_ROWS][KEYPAD_COLS] = {{'1', '2', '3', 'A'},
                                       {'4', '5', '6', 'B'},
                                       {'7', '8', '9', 'C'},
                                       {'*', '0', '#', 'D'}};
byte rowPins[KEYPAD_ROWS] = {PIN_ROW1, PIN_ROW2, PIN_ROW3, PIN_ROW4};
byte colPins[KEYPAD_COLS] = {PIN_COL1, PIN_COL2, PIN_COL3, PIN_COL4};
Keypad keypad =
    Keypad(makeKeymap(keys), rowPins, colPins, KEYPAD_ROWS, KEYPAD_COLS);

void vInputTask(void *pvParameters) {

  SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI);
  rfid.PCD_Init();

  String keyBuffer = "";
  unsigned long lastKeyTime = 0;

  for (;;) {
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      InputEvent evt;
      evt.type = EVENT_RFID_READ;

      String uidStr = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        if (rfid.uid.uidByte[i] < 0x10)
          uidStr += "0";
        uidStr += String(rfid.uid.uidByte[i], HEX);
      }
      uidStr.toUpperCase();
      strcpy(evt.data, uidStr.c_str());

      xQueueSend(xInputQueue, &evt, portMAX_DELAY);

      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();

      ControlCommand beepCmd;
      beepCmd.type = CMD_BEEP;
      beepCmd.value = 1;
      xQueueSend(xCommandQueue, &beepCmd, 0);
    }

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
