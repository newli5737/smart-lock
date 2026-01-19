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

  for (;;) {
    if (xQueueReceive(xDisplayQueue, &cmd, portMAX_DELAY) == pdTRUE) {
      if (cmd.type == CMD_UPDATE_DISPLAY) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Smart Lock");
        lcd.setCursor(0, 1);
        lcd.print(cmd.text);

        vTaskDelay(2000 / portTICK_PERIOD_MS);

        lcd.clear();
      }
    }
  }
}
