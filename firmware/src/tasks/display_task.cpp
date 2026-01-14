#include "config.h"
#include "globals.h"
#include <LiquidCrystal_I2C.h>
#include <Wire.h>


LiquidCrystal_I2C lcd(0x27, 16, 2); 

void vDisplayTask(void *pvParameters) {

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("Smart Lock System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  vTaskDelay(2000 / portTICK_PERIOD_MS);

  lcd.clear();
  lcd.print("Ready to Scan");

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
        lcd.setCursor(0, 0);
        lcd.print("Ready to Scan");
      }
    }
  }
}
