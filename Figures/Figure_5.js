//// Generate timelapse of medium resolution optical satellite imagery (Sentinel-2 and Pansharpened Landsat 8) showing pollution over the basra-baghdad highway in June 2020
// GEE link: https://code.earthengine.google.com/67bf6fd3258c4ebe823b607e40d4d83e

var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[47.278931255676866, 30.51484059783061],
          [47.278931255676866, 30.443829471808456],
          [47.363388653137804, 30.443829471808456],
          [47.363388653137804, 30.51484059783061]]], null, false);

var utils = require('users/gena/packages:utils')
var text = require('users/gena/packages:text')
var empty = ee.Image().byte();
var stats=require('users/ollielballinger/Pakistan:Thesis/ZonalStats')

var cloud_thresh = 40;

var maskClouds = function(image){
 var cloudScore = ee.Algorithms.Landsat.simpleCloudScore(image);
 var cloudLikelihood = cloudScore.select('cloud');
 var cloudPixels = cloudLikelihood.lt(cloud_thresh);
 return image.updateMask(cloudPixels);
}

var pansharp=function(image){
  var hsv = image.select(['B4', 'B3', 'B2']).rgbToHsv();
  
  var sharpened = ee.Image.cat([
    hsv.select('hue'), hsv.select('saturation'), image.select('B8')
  ]).hsvToRgb().copyProperties(image, ["system:time_start"])
  return sharpened;
}

var L8_vis= {min: 0, max: 0.31}

// Load a Landsat 8 top-of-atmosphere reflectance image.
var L8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_TOA')
          .filterBounds(geometry)
          .map(maskClouds)
          .map(pansharp)
          .map(function(img){return img.visualize(L8_vis).copyProperties(img, ["system:time_start"])})


var s2_vis = {
  min: 0.0,
  max: 3500,
  bands: ['B4', 'B3', 'B2'],
};

var sentinel2 = ee.ImageCollection('COPERNICUS/S2')
                  //.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',10))
                  .filterBounds(geometry)
                  .map(function(img){return img.visualize(s2_vis).copyProperties(img, ["system:time_start"])})
                  

var merged=sentinel2.merge(L8)


var aor=geometry

///////////////////////////////////// Config

var startDate = '2020-06-01';
var endDate = '2020-07-01';


var col=merged.filterDate(startDate,endDate)


var count = col.size();
print('Count: ', count);


var gif= function(col){
  
  var rgbVis =  col.map(function(image){
          var start = ee.Date(image.get('system:time_start'))
          var label = start.format('YYYY-MM-dd')//.cat(' - ').cat(end.format('YYYY-MM-dd'))

        return image.set({label: label});
    
  });
        
        
        var annotations = [
          {
            textColor:'white', position: 'left', offset: '1%', margin: '1%', property: 'label', scale: aor.area(100).sqrt().divide(200)
          }]
          
        rgbVis = rgbVis.map(function(image) {
          return text.annotateImage(image, {}, aor, annotations)
        })
        
        
        Map.addLayer(rgbVis)
        
        // Define GIF visualization parameters.
        var gifParams = {
          maxPixels: 27017280,
          region: geometry,
          crs:'EPSG:3857',
          dimensions: 640,
          framesPerSecond:5,
      };
        Export.video.toDrive({
          collection: rgbVis,
          description: 'Iraq',
          dimensions: 1080,
          framesPerSecond: 5,
          region: geometry
        });
        // Print the GIF URL to the console.
        print(rgbVis.getVideoThumbURL(gifParams));
        
        // Render the GIF animation in the console.
        print(ui.Thumbnail(rgbVis, gifParams));
        }


gif(col)


    
