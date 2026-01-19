"""
UART Protocol for ESP32 Communication

Message Format: JSON over serial
Baud Rate: 115200
Line Ending: \n

Messages FROM ESP32 to Backend:


2. Keypad Input:
   {"type": "keypad", "password": "123456"}

3. Status Update:
   {"type": "status", "door": "locked"}  // or "unlocked"

Messages FROM Backend to ESP32:
1. Unlock Door:
   {"cmd": "unlock", "duration": 5}  // duration in seconds

2. Lock Door:
   {"cmd": "lock"}

3. Set LED Status:
   {"cmd": "led", "color": "green"}  // green, red, blue, off

4. Beep:
   {"cmd": "beep", "times": 2}
"""

import serial
import json
import threading
import time
from typing import Callable, Optional

from services.singleton import SingletonMeta

class UARTService(metaclass=SingletonMeta):
    def __init__(self):
        from config import config_manager
        self.config_manager = config_manager
        self.port = config_manager.get("uart_port", "COM6")
        self.baudrate = config_manager.get("uart_baudrate", 115200)
        self.serial_conn: Optional[serial.Serial] = None
        self.running = False
        self.listener_thread: Optional[threading.Thread] = None
        self.message_callback: Optional[Callable] = None
        
    def connect(self, port: str = None, baudrate: int = None):

        if port:
            self.port = port
        if baudrate:
            self.baudrate = baudrate
            
        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1
            )
            print(f"Connected to ESP32 on {self.port} at {self.baudrate} baud")
            return True
        except serial.SerialException as e:
            print(f"Failed to connect to ESP32: {e}")
            return False
    
    def disconnect(self):
        self.running = False
        if self.listener_thread:
            self.listener_thread.join(timeout=2)
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
            print("Disconnected from ESP32")
    
    def send_message(self, message: dict) -> bool:
        if not self.serial_conn or not self.serial_conn.is_open:
            print("Serial connection not open")
            
            # Broadcast error to frontend
            try:
                from services.websocket import websocket_manager
                import asyncio
                
                payload = {
                    "type": "system_error",
                    "message": "Không kết nối được với mạch (Serial connection not open)"
                }
                
                loop = None
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                if loop.is_running():
                    loop.create_task(websocket_manager.broadcast(payload))
                else:
                    loop.run_until_complete(websocket_manager.broadcast(payload))
            except Exception as e:
                print(f"Failed to broadcast error: {e}")
                
            return False
        
        try:
            json_str = json.dumps(message) + "\n"
            self.serial_conn.write(json_str.encode('utf-8'))
            print(f"Sent to ESP32: {message}")
            return True
        except Exception as e:
            print(f"Error sending message: {e}")
            return False
    
    def send_command(self, message: dict) -> bool:
        return self.send_message(message)

    def unlock_door(self):
        return self.send_message({"cmd": "unlock"})
    
    def lock_door(self):
        return self.send_message({"cmd": "lock"})
    
    def set_led(self, color: str):
        return self.send_message({"cmd": "led", "color": color})
    
    def beep(self, times: int = 1):
        return self.send_message({"cmd": "beep", "times": times})
    
    def _listen(self):
        while self.running:
            try:
                if self.serial_conn and self.serial_conn.in_waiting > 0:
                    line = self.serial_conn.readline().decode('utf-8').strip()
                    if line:
                        try:
                            message = json.loads(line)
                            print(f"Received from ESP32: {message}")
                            if self.message_callback:
                                self.message_callback(message)
                        except json.JSONDecodeError:
                            print(f"Invalid JSON from ESP32: {line}")
                time.sleep(0.1)
            except Exception as e:
                print(f"Error in listener thread: {e}")
                time.sleep(1)
    
    def start_listening(self, callback: Callable):
        self.message_callback = callback
        self.running = True
        self.listener_thread = threading.Thread(target=self._listen, daemon=True)
        self.listener_thread.start()
        print("Started listening for ESP32 messages")

uart_service = UARTService()
