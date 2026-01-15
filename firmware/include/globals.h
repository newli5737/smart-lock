#ifndef GLOBALS_H
#define GLOBALS_H

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>
#include <freertos/task.h>

// --- Data Structures ---

enum EventType {
  EVENT_FINGERPRINT_DETECTED,
  EVENT_FINGERPRINT_ENROLL_START,  // New: Start enrollment process
  EVENT_KEYPAD_PRESS,
  EVENT_KEYPAD_SUBMIT // When user presses '#' or full password collected
};

struct InputEvent {
  EventType type;
  char data[32]; 
};

enum CommandType { CMD_UNLOCK, CMD_LOCK, CMD_BEEP, CMD_UPDATE_DISPLAY };

struct ControlCommand {
  CommandType type;
  int value;    
  char text[32]; 
};

extern QueueHandle_t xInputQueue;
extern QueueHandle_t xCommandQueue;
extern QueueHandle_t xDisplayQueue;
extern SemaphoreHandle_t xSerialMutex; 

#endif
