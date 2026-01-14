#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

#define SERIAL_BAUD_RATE 115200
// Relay
#define PIN_RELAY 4

// Buzzer 
#define PIN_BUZZER 15

// I2C (LCD1602)
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22

// SPI (RFID MFRC522)
// Default VSPI: SCK=18, MISO=19, MOSI=23
#define PIN_RFID_SDA 5  // SS/SDA Changed from 21 to 5 to avoid I2C conflict
#define PIN_RFID_RST 17 // RST
#define PIN_RFID_SCK 18
#define PIN_RFID_MISO 19
#define PIN_RFID_MOSI 23

// Keypad 4x4
// R1, R2, R3, R4, C1, C2, C3, C4
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
