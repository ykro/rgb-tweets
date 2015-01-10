#include "application.h"
//#include "spark_disable_wlan.h" // For faster local debugging only
#include "neopixel/neopixel.h"

#define PIXEL_PIN D2
#define PIXEL_COUNT 2
#define PIXEL_TYPE WS2812B

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
  uint16_t i, j;
  for(j=0;j < 3;j++) {
    for(i=0;i < strip.numPixels();i++) {
      strip.setPixelColor(i, color);
      strip.show();
      delay(500);
      strip.setPixelColor(i, strip.Color(0,0,0));
      strip.show();
    }
  }
  
  for(i=0;i < strip.numPixels();i++) {
    strip.setPixelColor(i, color);
    strip.show();
    delay(500);
  }
  delay(3000);
}

int changeColor(String args) {
  int r = args.substring(0, args.indexOf(",")).toInt();
  int g = args.substring(args.indexOf(",")+1, args.lastIndexOf(",")).toInt();
  int b = args.substring(args.lastIndexOf(",")+1).toInt();
  lightLEDs(strip.Color(r,g,b));
  return 1;
}