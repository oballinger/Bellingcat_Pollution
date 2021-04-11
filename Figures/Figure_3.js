//// Generate timelapse of Sentinel-5p NO2 readings over Northern Iraq
// GEE link: https://code.earthengine.google.com/7cf0e731bc67c97098adccdcbf2ae6b7

var geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[42.648746622467826, 36.628924996530486],
          [42.648746622467826, 35.232333600954824],
          [44.725162638092826, 35.232333600954824],
          [44.725162638092826, 36.628924996530486]]], null, false),
    kirkuk = /* color: #98ff00 */ee.Feature(
        ee.Geometry({
          "type": "GeometryCollection",
          "geometries": [
            {
              "type": "Point",
              "coordinates": [
                42.83783565014186,
                35.815861817428285
              ]
            },
            {
              "type": "Point",
              "coordinates": [
                45.15595088451686,
                36.15367482913026
              ]
            },
            {
              "type": "Polygon",
              "coordinates": [
                [
                  [
                    44.1675250908459,
                    35.65620702125217
                  ],
                  [
                    44.0521686455334,
                    35.562421546727336
                  ],
                  [
                    44.081007756861524,
                    35.506544682718506
                  ],
                  [
                    44.204603948267774,
                    35.512134120320354
                  ],
                  [
                    44.2004840752209,
                    35.45398495558105
                  ],
                  [
                    44.2883747002209,
                    35.400271476720356
                  ],
                  [
                    44.278761663111524,
                    35.31515190858186
                  ],
                  [
                    44.380385198267774,
                    35.299462203802236
                  ],
                  [
                    44.6234577080334,
                    35.4774733361292
                  ],
                  [
                    44.265028752955274,
                    35.682982671599724
                  ]
                ]
              ],
              "geodesic": true,
              "evenOdd": true
            }
          ],
          "coordinates": []
        }),
        {
          "label": "Kirkuk",
          "system:index": "0"
        }),
    Mosul = 
    /* color: #0b4a8b */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Feature(
        ee.Geometry.Polygon(
            [[[42.942904843846755, 36.51832480645466],
              [42.942904843846755, 36.20868134671414],
              [43.431796445409255, 36.20868134671414],
              [43.431796445409255, 36.51832480645466]]], null, false),
        {
          "label": "Makhmur",
          "system:index": "0"
        }),
    Erbil = 
    /* color: #00ffff */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Feature(
        ee.Geometry.Polygon(
            [[[43.74701118495191, 36.34360566296844],
              [43.74701118495191, 36.04215091755995],
              [44.24139595057691, 36.04215091755995],
              [44.24139595057691, 36.34360566296844]]], null, false),
        {
          "label": "Erbil",
          "system:index": "0"
        }),
    basra = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry({
      "type": "GeometryCollection",
      "geometries": [
        {
          "type": "Polygon",
          "coordinates": [
            [
              [
                47.68610996851214,
                30.568349073131632
              ],
              [
                47.79734654077777,
                30.431681743615744
              ],
              [
                48.005400129644954,
                30.39674460404496
              ],
              [
                48.08093113550433,
                30.453585093129963
              ],
              [
                47.86189121851214,
                30.539375083701238
              ],
              [
                47.78086704859027,
                30.684158466690022
              ],
              [
                47.73966831812152,
                30.67589096435714
              ]
            ]
          ],
          "geodesic": true,
          "evenOdd": true
        },
        {
          "type": "Point",
          "coordinates": [
            45.46618065482811,
            30.745554083913362
          ]
        },
        {
          "type": "Point",
          "coordinates": [
            49.79479393607811,
            30.70777805433361
          ]
        },
        {
          "type": "Point",
          "coordinates": [
            48.40502342826561,
            32.16997519523882
          ]
        },
        {
          "type": "Point",
          "coordinates": [
            47.82824120170311,
            29.42901318540218
          ]
        }
      ],
      "coordinates": []
    }),
    geometry2 = 
    /* color: #98ff00 */
    /* shown: false */
    ee.Geometry.MultiPoint();

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

function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filterDate('2020-01-01', '2020-01-30')
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds)
                  .mean()

var s2_vis = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};

var s2=sentinel2.visualize(s2_vis)

var aor=geometry

function reduce_date(collection, increment){
  var weekDifference = ee.Date(startDate).advance(1, increment).millis().subtract(ee.Date(startDate).millis());
  var listMap = ee.List.sequence(ee.Date(startDate).millis(), ee.Date(endDate).millis(), weekDifference);
  
  function getWeekly(date) {
    var date = ee.Date(date);
    var sentinel5 = collection.filterDate(date, date.advance(1, increment))
                        .filterBounds(geometry)
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
                  .map(function(img){return img.resample('bicubic')})
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
                    .select('tropospheric_NO2_column_number_density').filterBounds(geometry)
                    
                    

var s5_palette = ['blue','green','yellow','red']

var NO_vis={
    min: 0.00001,
    max: 0.0002,
    opacity:0.7,
    palette : s5_palette,
}

var NO_mask=0.0000
var NO_conv=8


//var viirs_palette = ['#000004','#320a5a','#781b6c','#bb3654','#ec6824','#fbb41a','#fcffa4']
var VIIRSvis = {min: 2.1,max: 2.8 , opacity:0.3, palette: palettes.colorbrewer.Greys[9].reverse()}
var VIIRSvis_basra = {min: 0.8,max: 2 , opacity:0.8, palette: palettes.colorbrewer.Greys[9].reverse()}
var VIIRSvis_flares = {min: 2,max: 4, opacity:0.8, palette: palettes.colorbrewer.YlOrRd[9].reverse()}

var cities=ee.FeatureCollection([kirkuk,Erbil,Mosul])
///////////////////////////////////// Config

var startDate = '2020-10-01';
var endDate = '2020-12-01';

var col_vis= NO_vis
var s5_mask=NO_mask
var conv_size=NO_conv
var collection=reduce_date(NO_collection,'day')

var image_prior=reduce_date(stats.time_agg(collection, "YYYY-MM-day"), 'day')


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
  opacity: 0.1, min: 0, max: 255, forceRgbOutput: true});


  var rgbVis =  col.map(function(image){
          var start = ee.Date(image.get('system:time_start'))
          var label = start.format('YYYY-MM-dd')//.cat(' - ').cat(end.format('YYYY-MM-dd'))
          
          var s5_1 = image.updateMask(image.gt(0.00005)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_2 = image.updateMask(image.gt(0.00006)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_3 = image.updateMask(image.gt(0.00007)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_4 = image.updateMask(image.gt(0.00008)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_5 = image.updateMask(image.gt(0.00009)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_6 = image.updateMask(image.gt(0.00010)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_7 = image.updateMask(image.gt(0.00011)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_8 = image.updateMask(image.gt(0.00012)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_9 = image.updateMask(image.gt(0.00013)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})
          var s5_10 = image.updateMask(image.gt(0.00014)).visualize({min: 0.00007,max: 0.0002,opacity:0.1,palette : s5_palette})

          
          
          var VIIRS_basemap=VIIRS.filterDate('2020-01-01','2020-03-01').mean()//.clip(mask)
          //var VIIRS_basemap=VIIRS.filterDate(start.getRange("month")).mean().visualize(VIIRSvis)
          
          var VIIRS_basra=VIIRS_basemap.updateMask(VIIRS_basemap.gt(1.2)).visualize(VIIRSvis_basra).clip(cities)
          var flares=VIIRS_basemap.updateMask(VIIRS_basemap.gt(2.3)).visualize(VIIRSvis_flares)
          
          var comp=s2.blend(VIIRS_basemap.visualize(VIIRSvis))
                          .blend(s5_1)
                          .blend(s5_2)
                          .blend(s5_3)
                          .blend(s5_4)
                          .blend(s5_5)
                          .blend(s5_6)
                          .blend(s5_7)
                          .blend(s5_8)
                          .blend(s5_9)
                          .blend(s5_10)
                          .blend(VIIRS_basra)
                          .blend(flares)
                          .blend(border)
                          
        return comp.blend(dullLayer)
                    .blend(comp.clipToCollection(mask))
                    .set({label: label});
    
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
          dimensions: 700,
          framesPerSecond:2,
      };
        Export.video.toDrive({
          collection: rgbVis,
          description: 'Basra',
          dimensions: 1080,
          framesPerSecond: 2,
          region: geometry
        });
        
        var filmArgs = {
          dimensions: 700,
          region: geometry,
          crs: 'EPSG:3857'
        };
        
        print(rgbVis.getFilmstripThumbURL(filmArgs));
        // Print the GIF URL to the console.
        print(rgbVis.getVideoThumbURL(gifParams));
        
        // Render the GIF animation in the console.
        print(ui.Thumbnail(rgbVis, gifParams));
        }


gif(col)
