//// Generate a timelapse of nighttime lights for Northern Iraq
// GEE link: https://code.earthengine.google.com/4a41acbd4b2eb95f2ec7186a31f36a76

var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[42.555362833405326, 36.62010778397765],
          [42.555362833405326, 35.18296243288332],
          [44.681217325592826, 35.18296243288332],
          [44.681217325592826, 36.62010778397765]]], null, false),
    mosul = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Feature(
        ee.Geometry.Polygon(
            [[[43.054977780266675, 36.438274276521234],
              [43.054977780266675, 36.290642221212416],
              [43.24792516796199, 36.290642221212416],
              [43.24792516796199, 36.438274276521234]]], null, false),
        {
          "label": "Mosul",
          "system:index": "0"
        }),
    qayyarah = 
    /* color: #98ff00 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Feature(
        ee.Geometry.Polygon(
            [[[43.08240275545117, 35.8925587996721],
              [43.08240275545117, 35.77899970860588],
              [43.26642375154492, 35.77899970860588],
              [43.26642375154492, 35.8925587996721]]], null, false),
        {
          "label": "Qayyarah",
          "system:index": "0"
        });



var utils = require('users/gena/packages:utils')
var text = require('users/gena/packages:text')
var empty = ee.Image().byte();
var palettes = require('users/gena/packages:palettes');


var mask = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0")
            .filter(ee.Filter.or(
              ee.Filter.eq('ADM0_NAME', "Iraq")
              ))

var border = empty.paint({
  featureCollection: mask,
  color: 1,
  width: 1
}).visualize({palette: '#FFFFFF'});

var aor=geometry



var VIIRS= ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG") 
                  .select('avg_rad').sort('system:time_start')
                  .map(function(image) {
                    var blank=image.reduceRegions({
                                    collection: mosul, 
                                    reducer: ee.Reducer.sum(), 
                                    scale: 10})
                                .first()
                                .get('sum')
                    
                    //var image=image.updateMask(10)
                    return image.set('blank', blank)
                    })
                  .filter(ee.Filter.gt('blank', 10))

       

var viirs_palette = ['#000004','#320a5a','#781b6c','#bb3654','#ec6824','#fbb41a','#fcffa4']
//var viirs_palette = palettes.matplotlib.inferno[7]
var VIIRSvis = {min: -0.1,max: 1.6 , palette: viirs_palette}



///////////////////////////////////// Config

var startDate = '2013-01-01';
var endDate = '2018-01-01';

var export_name='qayyarah_viirs'
var col_vis= VIIRSvis
var col = VIIRS.filterDate(startDate, endDate)
                .map(function(image) {
                    return image.log10().unmask(0)
                    })
                    
                    
var gif= function(col){
 

  var rgbVis =  col.map(function(image){
          var start = ee.Date(image.get('system:time_start'))
          var label = start.format('YYYY-MM-dd')
        return image.visualize(col_vis).set({label: label});
    
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
          description: export_name,
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


var regions=[qayyarah, mosul]
var chart2 =
    ui.Chart.image
        .seriesByRegion({
          imageCollection: VIIRS,
          regions: regions,
          reducer: ee.Reducer.mean(),
          seriesProperty:'label'
        }).setOptions({
          title: 'Nighttime Lights'
        });
        
print(chart2)
