#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

#define SERIAL_BAUD_RATE 115200
// Relay
#define PIN_RELAY 4

// Buzzer 
#define PIN_BUZZER 15

// LED Status Indicator
#define PIN_LED 2   // Status LED (blink pattern: fast=error, slow=success, solid=ready)

// I2C (LCD1602)
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22

// UART AS608 
#define PIN_FINGERPRINT_TX 16  // TX to sensor RX
#define PIN_FINGERPRINT_RX 17  // RX to sensor TX

// Keypad 4x4
const byte KEYPAD_ROWS = 4;
const byte KEYPAD_COLS = 4;
const byte PIN_ROW1 = 13;
const byte PIN_ROW2 = 12;
const byte PIN_ROW3 = 14;
const byte PIN_ROW4 = 27;
const byte PIN_COL1 = 26;
const byte PIN_COL2 = 25;
const byte PIN_COL3 = 33;
const byte PIN_COL4 = 32;

#define LOCK_OPEN_TIME_DEFAULT 5000 
#define DEBOUNCE_DELAY 50

#endif
