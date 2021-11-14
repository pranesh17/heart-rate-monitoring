#include <Arduino.h>
 
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>

#define USE_ARDUINO_INTERRUPTS false
#include <PulseSensorPlayground.h>
//const int OUTPUT_TYPE = SERIAL_PLOTTER;
//  Variables

byte samplesUntilReport;
const byte SAMPLES_PER_SERIAL_SAMPLE = 10;

PulseSensorPlayground pulseSensor;

int PulseSensorPurplePin = 0;        // Pulse Sensor PURPLE WIRE connected to ANALOG PIN 0
int LED13 = 13;   //  The on-board Arduion LED

WebSocketsClient webSocket;

const char *ssid     = "Sri";
const char *password = "tabletennis5";
 
unsigned long messageInterval = 5000;
bool connected = false;

#define DEBUG_SERIAL Serial
 
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            DEBUG_SERIAL.printf("[WSc] Disconnected!\n");
            connected = false;
            break;
        case WStype_CONNECTED: {
            DEBUG_SERIAL.printf("[WSc] Connected to url: %s\n", payload);
            connected = true;
 
            // send message to server when Connected
            DEBUG_SERIAL.println("[WSc] SENT: Connected");
            webSocket.sendTXT("Connected");
        }
            break;
        case WStype_TEXT:
            DEBUG_SERIAL.printf("[WSc] RESPONSE: %s\n", payload);
            break;
        case WStype_BIN:
            DEBUG_SERIAL.printf("[WSc] get binary length: %u\n", length);
            hexdump(payload, length);
            break;
                case WStype_PING:
                        // pong will be send automatically
                        DEBUG_SERIAL.printf("[WSc] get ping\n");
                        break;
                case WStype_PONG:
                        // answer to a ping we send
                        DEBUG_SERIAL.printf("[WSc] get pong\n");
                        break;
    }
 
}


int Signal;                // holds the incoming raw data. Signal value can range from 0-1024
int Threshold = 550;            // Determine which Signal to "count as a beat", and which to ingore.
const int PULSE_INPUT = A0;
const int PULSE_BLINK = 2;    // Pin 13 is the on-board LED
const int PULSE_FADE = 5;

void setup() {
    pinMode(LED13,OUTPUT); // pin that will blink to your heartbeat!
    DEBUG_SERIAL.begin(115200); 


  // Configure the PulseSensor manager.
  pulseSensor.analogInput(PULSE_INPUT);
  pulseSensor.blinkOnPulse(PULSE_BLINK);
  pulseSensor.fadeOnPulse(PULSE_FADE);

  pulseSensor.setSerial(Serial);
  //pulseSensor.setOutputType(OUTPUT_TYPE);
  pulseSensor.setThreshold(Threshold);

  // Skip the first SAMPLES_PER_SERIAL_SAMPLE in the loop().
  samplesUntilReport = SAMPLES_PER_SERIAL_SAMPLE;
    DEBUG_SERIAL.println();
    
    for(uint8_t t = 4; t > 0; t--) {
        DEBUG_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
        DEBUG_SERIAL.flush();
        delay(1000);
    }
 
    WiFi.begin(ssid, password);
 
    while ( WiFi.status() != WL_CONNECTED ) {
      delay ( 500 );
      Serial.print ( "." );
    }
    DEBUG_SERIAL.print("Local IP: "); DEBUG_SERIAL.println(WiFi.localIP());
    // server address, port and URL
    webSocket.begin("192.168.43.173", 3000, "/");
 
    // event handler
    webSocket.onEvent(webSocketEvent);
}
 
unsigned long lastUpdate = millis();

// The Main Loop Function
void loop() {
  webSocket.loop();
  
    if (connected ){
      if (pulseSensor.sawNewSample()) {
    
    if (--samplesUntilReport == (byte) 0) {
      samplesUntilReport = SAMPLES_PER_SERIAL_SAMPLE;

      //pulseSensor.getPulseAmplitude();
      Serial.println(pulseSensor.getLatestSample());
     
      if (pulseSensor.sawStartOfBeat()) {
        //Serial.println("hi");
        //pulseSensor.outputBeat();
        //pulseSensor.outputSample();
        //Serial.println(pulseSensor.getBeatsPerMinute());
        String myString = "";
        myString.concat(pulseSensor.getBeatsPerMinute());
        DEBUG_SERIAL.println("[WSc] SENT: " + myString);
        webSocket.sendTXT(myString);
        
      }
      else{
      webSocket.sendTXT("N");
        
      }

    }
  }

      
      //Signal = analogRead(PulseSensorPurplePin);

      

      /*if(Signal > Threshold){                          // If the signal is above "550", then "turn-on" Arduino's on-Board LED.
        digitalWrite(LED13,HIGH);
      } else {
        digitalWrite(LED13,LOW);                //  Else, the sigal must be below "550", so "turn-off" this LED.
      }*/

       
      

      //lastUpdate = millis();
    }
}
