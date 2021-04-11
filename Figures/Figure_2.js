//// Generate a timelapse of Sentinel-5p Nitrogen Dioxide readings over Iraq for 2020
// GEE link: https://code.earthengine.google.com/38ec64a32e75a9d3b1dff46e482287b8

var aor = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[38.754093302155326, 37.40960656682157],
          [38.754093302155326, 29.003522708783034],
          [48.663761270905326, 29.003522708783034],
          [48.663761270905326, 37.40960656682157]]], null, false);

var utils = require('users/gena/packages:utils')
var text = require('users/gena/packages:text')
var empty = ee.Image().byte();

var palettes = require('users/gena/packages:palettes');

var mask = ee.FeatureCollection("FAO/GAUL_SIMPLIFIED_500m/2015/level0")
            .filter(ee.Filter.or(
              ee.Filter.eq('ADM0_NAME', "Iraq")
              ))


var bg=ee.Image(0).visualize({palette: '#FFFFFF'});

Map.addLayer(bg)

function reduce_date(collection, increment){
  var weekDifference = ee.Date(startDate).advance(1, increment).millis().subtract(ee.Date(startDate).millis());
  var listMap = ee.List.sequence(ee.Date(startDate).millis(), ee.Date(endDate).millis(), weekDifference);
  
  function getWeekly(date) {
    var date = ee.Date(date);
    var sentinel5 = collection.filterDate(date, date.advance(1, increment))
                        .filterBounds(aor)
                        .mean()
  
  
    return sentinel5
  }
  
  var image_prior = ee.ImageCollection.fromImages(listMap.map(function(dateMillis){
    var date = ee.Date(dateMillis).format("YYYY-MM-dd")
    return getWeekly(date).set("system:time_start", date);
  }));
  
  return image_prior
}



var VIIRS= ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG") 
                  .select('avg_rad').sort('system:time_start')
                  .map(function(image) {
                    var blank=image.reduceRegions({
                                    collection: aor, 
                                    reducer: ee.Reducer.sum(), 
                                    scale: 10})
                                .first()
                                .get('sum')
                    
                    //var image=image.updateMask(10)
                    return image.set('blank', blank)
                    })
                  .map(function(image) {
                    return image.log10().unmask(0)
                    })
                  .filter(ee.Filter.gt('blank', 10))


var NO_collection=ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_NO2')
                    .select('tropospheric_NO2_column_number_density').filterBounds(aor)
                    
                    
var s5_palette = ['#1f20e9','#00fbf6','#01b60c','#f8fd00','#ff8a00','#ff0300','#5a0181']

var NO_vis={
    min: 0.00001,
    max: 0.00012,
    opacity:0.7,
    palette : s5_palette,
}

var NO_mask=0.0000
var NO_conv=1


var viirs_palette = ['#000004','#320a5a','#781b6c','#bb3654','#ec6824','#fbb41a','#fcffa4']
//var viirs_palette = palettes.matplotlib.inferno[7]
var VIIRSvis = {min: 0,max: 2 , palette: viirs_palette}
var VIIRSvis_top = {min: 0.4,max: 2 ,opacity:0.4, palette: ['black','white']}



///////////////////////////////////// Config

var startDate = '2020-01-01';
var endDate = '2021-01-01';

var col_vis= NO_vis
var s5_mask=NO_mask
var conv_size=NO_conv
var collection=reduce_date(NO_collection,'day')

var image_prior=reduce_date(stats.time_agg(collection, "YYYY-MM-ww"), 'week')


var count = image_prior.size();
print('Count: ', count);

var boxcar = ee.Kernel.gaussian({
  radius: conv_size, units: 'pixels', normalize: true,sigma:15
});


var col = image_prior.map(function(img) {
  var img=img.convolve(boxcar)

  return img.updateMask(img.gt(s5_mask)).copyProperties(img, ["system:time_start"]);
});


var gif= function(col){
  
  var dullLayer = ee.Image.constant(175).visualize({
  opacity: 0.8, min: 0, max: 255, forceRgbOutput: true});


  var rgbVis =  col.map(function(image){
          var start = ee.Date(image.get('system:time_start'))
          var label = start.format('YYYY-MM-dd')//.cat(' - ').cat(end.format('YYYY-MM-dd'))
          
          var VIIRS_basemap=VIIRS.filterDate('2020-01-01','2020-03-01').mean().clip(mask)
          
          var VIIRS_top=VIIRS_basemap.updateMask(VIIRS_basemap.gt(1.2))
          var comp=bg.blend(VIIRS_basemap.visualize(VIIRSvis))
                          .blend(image.visualize(col_vis)
                          .blend(VIIRS_top.visualize(VIIRSvis_top))
                          .clip(mask))

        return comp.set({label: label});
    
  });
        
        
        var annotations = [
          {
            textColor:'black', position: 'left', offset: '1%', margin: '1%', property: 'label', scale: aor.area(100).sqrt().divide(200)
          }]
          
        rgbVis = rgbVis.map(function(image) {
          return text.annotateImage(image, {}, aor, annotations)
        })
        
        
        Map.addLayer(rgbVis)
        
        // Define GIF visualization parameters.
        var gifParams = {
          maxPixels: 27017280,
          region: aor,
          crs:'EPSG:3857',
          dimensions: 640,
          framesPerSecond:5,
      };
        Export.video.toDrive({
          collection: rgbVis,
          description: 'Iraq',
          dimensions: 1080,
          framesPerSecond: 5,
          region: aor
        });
        // Print the GIF URL to the console.
        print(rgbVis.getVideoThumbURL(gifParams));
        
        // Render the GIF animation in the console.
        print(ui.Thumbnail(rgbVis, gifParams));
        }


gif(col)
