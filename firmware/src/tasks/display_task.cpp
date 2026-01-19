#include "config.h"
#include "globals.h"
#include <LiquidCrystal_I2C.h>
#include <Wire.h>


LiquidCrystal_I2C lcd(0x27, 16, 2); 

void vDisplayTask(void *pvParameters) {

  Serial.println("LCD:INIT_START");
  
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Serial.println("LCD:I2C_INITIALIZED");
  
  lcd.init();
  Serial.println("LCD:INIT_DONE");
  
  lcd.backlight();
  Serial.println("LCD:BACKLIGHT_ON");

  lcd.setCursor(0, 0);
  lcd.print("Smart Lock System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  Serial.println("LCD:DISPLAY_READY");
  
  vTaskDelay(2000 / portTICK_PERIOD_MS);

  Serial.println("LCD:READY");

  ControlCommand cmd;

  unsigned long lastUpdate = 0;
  bool messageShown = false;

  for (;;) {
    // Wait for message with 100ms timeout to allow checking for clear timer
    if (xQueueReceive(xDisplayQueue, &cmd, 100 / portTICK_PERIOD_MS) == pdTRUE) {
      if (cmd.type == CMD_UPDATE_DISPLAY) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Smart Lock");
        lcd.setCursor(0, 1);
        lcd.print(cmd.text);
        
        lastUpdate = millis();
        messageShown = true;
      }
    }

    // Clear message after 3 seconds if not updated
    if (messageShown && (millis() - lastUpdate > 3000)) {
       lcd.setCursor(0, 1);
       lcd.print("                "); // Clear valid/invalid/password text
       messageShown = false;
    }
  }
}
