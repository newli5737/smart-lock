#include "config.h"
#include "globals.h"
#include <Arduino.h>


extern void vSerialTask(void *pvParameters);
extern void vInputTask(void *pvParameters);
extern void vControlTask(void *pvParameters);
extern void vDisplayTask(void *pvParameters);

QueueHandle_t xInputQueue;
QueueHandle_t xCommandQueue;
QueueHandle_t xDisplayQueue;
SemaphoreHandle_t xSerialMutex;

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  while (!Serial) {
    ; 
  }

  xInputQueue = xQueueCreate(10, sizeof(InputEvent));
  xCommandQueue = xQueueCreate(10, sizeof(ControlCommand));
  xDisplayQueue = xQueueCreate(5, sizeof(ControlCommand));
  xSerialMutex = xSemaphoreCreateMutex();

  if (xInputQueue == NULL || xCommandQueue == NULL || xSerialMutex == NULL) {
    Serial.println("Error creating RTOS objects");
    while (1)
      ;
  }

  xTaskCreatePinnedToCore(vSerialTask, "SerialTask", 4096, NULL, 2, NULL,
                          1 
  );

  xTaskCreatePinnedToCore(vInputTask, "InputTask", 4096, NULL, 1, NULL,
                          1 
  );

  xTaskCreatePinnedToCore(vControlTask, "ControlTask", 4096, NULL, 2, NULL,
                          1 
  );

  xTaskCreatePinnedToCore(vDisplayTask, "DisplayTask", 4096, NULL, 1, NULL,
                          0 
  );

  Serial.println("BOOT:READY");
}

void loop() {
  vTaskDelete(NULL);
}
