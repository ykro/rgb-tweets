#include "application.h"
//#include "spark_disable_wlan.h" // For faster local debugging only
#include "neopixel/neopixel.h"

#define PIXEL_PIN D0
#define PIXEL_COUNT 8
#define PIXEL_TYPE WS2812B

#define SHORT_DELAY 250
#define LONG_DELAY 3000
Adafruit_NeoPixel strip = Adafruit_NeoPixel(PIXEL_COUNT, PIXEL_PIN, PIXEL_TYPE);

void setup() {
  Serial.begin(9600);
  Spark.function("changeColor", changeColor);
  
  strip.begin();
  strip.show();
}

void loop() {
  lightLEDs(strip.Color(255,0,0));
}

void lightLEDs(int color) {
  int times = 3;
  circle(color, times);
  blink(color, times);
  on(color, LONG_DELAY);
  
}

void circle(int color, int times) {
  uint16_t i, j;
  for(j=0;j < times;j++) {
    for(i=0;i < strip.numPixels();i++) {
      strip.setPixelColor(i, color);
      strip.show();
      delay(SHORT_DELAY);
      strip.setPixelColor(i, strip.Color(0,0,0));
      strip.show();
    }
  }    
}

void on(int color, int keepOn) {
  uint16_t i;
  for(i=0;i < strip.numPixels();i++) {
    strip.setPixelColor(i, color);
    strip.show();
    delay(SHORT_DELAY);
  }
  delay(keepOn);
}

void blink(int color, int times) {
  uint16_t i, j;
  
  for (j=0; j < times;j++) {
    for(i=0;i < strip.numPixels();i++) {
      strip.setPixelColor(i, strip.Color(0,0,0));
    }
      
    strip.show();
    delay(SHORT_DELAY);
       
    for(i=0;i < strip.numPixels();i++) {
      strip.setPixelColor(i, color);
    }
    strip.show();
    delay(SHORT_DELAY);
  }
}

int changeColor(String args) {
  int r = args.substring(0, args.indexOf(",")).toInt();
  int g = args.substring(args.indexOf(",")+1, args.lastIndexOf(",")).toInt();
  int b = args.substring(args.lastIndexOf(",")+1).toInt();
  lightLEDs(strip.Color(r,g,b));
  return 1;
}