(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.lc = global.lc || {})));
}(this, function (exports) { 'use strict';

	//Basic object that can be chart or layer
	function base() {
		
	  var obj = {};
	  obj.propList = [];
		
	  obj.add_property = function( propname, defaultval ) {
			
	    obj.propList.push(propname);
			var getter = "get_" + propname;
	    var overrideList = {};

	    obj[ propname ] = function( vf, propname, overrideFunc ) {

	      if( vf === undefined )
	        return obj[ getter ]();      

	      if( vf == "_override_"){
	        if(typeof overrideFunc === "function")
	          overrideList[propname] = overrideFunc
	        else
	          overrideList[propname] = function() {return overrideFunc;}
	      } else {
	        if( typeof(vf) === "function" )
	          obj[ getter ] = vf
	        else
	          obj[ getter ] = function() { return vf };

	        for(var i in overrideList)
	          obj["get_" + i] = overrideList[i];
	      }
	      //setter always returns chart, never layer
	      if(obj.layers)
	        return obj
	      else
	        if(obj.chart)
	          return obj.chart
	        else
	          return obj;
	    }

			if(typeof defaultval === "function")
				obj[ getter ] = defaultval
			else
				obj[ getter ] = function() { return defaultval };
	    return obj;
	  }
		
		return obj;
	}

	function cache( f ) {
	  var the_cache = {}
	  return function() {
	    if( arguments[0] === "clear" ) {
	      the_cache = {}
	      return undefined;
	    }
	    if( !( arguments in Object.keys(the_cache) ) &&
				!(arguments.length == 0 && Object.keys(the_cache).length != 0))
	      the_cache[arguments] = f.apply( undefined, arguments );
	    return the_cache[arguments];
	  }
	}

	function separateBy(data, properties){
	  if(typeof data !== "object")
	    throw "Error in function 'separateBy': first argument is not an object";
	  
	  //check if data is an object or an array
	  var type;
	  typeof data.length === "undefined" ? type = "obj" : type = "arr";

	  if(typeof properties === "number" || typeof properties === "string")
	    properties = [properties];
	  //turn "properities" into an array and throw an Error if this isn't possible
	  if(typeof properties.length === "undefined")
	    throw "Error in function 'separateBy': " + properties.toString() +
	          " is not a property name"; 
	  
	  //end of a recursive function. There are no more properties to
	  //separate by
	  if(properties.length == 0)
	    return data;

	  var newData = {}, uniqueList = [], keys, value;
	  //if data is an array, keys = ["0", "1", "2", ...]
	  var keys = Object.keys(data);

	  //go through all elements to find all possible values of the selected property
	  for(var i = 0; i < keys.length; i++){
	    if(typeof data[keys[i]][properties[0]] !== "undefined" &&
	      uniqueList.indexOf(data[keys[i]][properties[0]]) == -1
	    )
	      uniqueList.push(data[keys[i]][properties[0]]);
	  }

	  //if none of the objects have this property, continue with the next step
	  //of the recursion
	  if(uniqueList.length == 0){
	    properties.shift();
	    return separateBy(data, properties)
	  }
	  //otherwise initialize properties of the new object
	  for(var i = 0; i < uniqueList.length; i++)
	    type == "obj" ? newData[uniqueList[i]] = {} : newData[uniqueList[i]] = [];

	  //go through all the elements again and place them in a suitable category
	  for(var i = 0; i < keys.length; i++){
	    value = data[keys[i]][properties[0]];
	    if(typeof value !== "undefined"){
	      delete data[keys[i]][properties[0]];
	      if(type == "obj") newData[value][keys[i]] = {};
	      type == "obj" ? Object.assign(newData[value][keys[i]], data[keys[i]]) :
	                      newData[value].push(data[keys[i]]);
	    }
	  }
	  //if type is array but all values of the property are unique change arrays in objects
	  //May be this should be optional
	  if(type == "arr"){
	    var change = true, i = 0;
	    while(change && i < uniqueList.length){
	      change = (newData[uniqueList[i]].length == 1);
	      i++;
	    }
	    if(change){
	      var a;
	      for(var i = 0; i < uniqueList.length; i++){
	        a = {};
	        Object.assign(a, newData[uniqueList[i]][0]);
	        newData[uniqueList[i]] = {};
	        Object.assign(newData[uniqueList[i]], a);
	      }
	    }
	  }
	  //Now go through all the properties of the new object and call this function
	  //recursively
	  properties.shift();
	  
	  for(var i = 0; i < uniqueList.length; i++)
	    newData[uniqueList[i]] = separateBy(newData[uniqueList[i]], properties.slice());
	  return newData;
	}

	function getEuclideanDistance(a, b) {
		if(a.length != b.length)
			throw "Error in getEuclideanDistance: length of the" +
				"input vectors is not the same";
		var sum = 0;
		for(var i = 0; i < a.length; i++)
			sum += (a[i] - b[i]) * (a[i] - b[i]);
		
		return Math.sqrt(sum);
	}

	function add_click_listener(chart){

	  var wait_dblClick = null, down, wait_click = null,
	    tolerance = 5, click_coord, downThis,
	    event = d3.dispatch('click', 'dblclick');

	  //add a transparent rectangle to detect clicks
	  //and make changes to update function
	  chart.svg.append("rect")
	    .attr("class", "clickPanel")
	    .attr("fill", "transparent")
	    .lower();
	  var inherited_updateSize = chart.updateSize;
	  
	  chart.updateSize = function(){
	    inherited_updateSize();
	     chart.svg.selectAll(".clickPanel")
	      .attr("width", chart.get_width())
	      .attr("height", chart.get_height());
	    return chart;
	  }

	  var on_mousedown = function(){
	    down = d3.mouse(document.body);
	    downThis = d3.mouse(this)
	    wait_click = window.setTimeout(function() {wait_click = null;}, 1000);
	    var p = d3.mouse(this);  //Mouse position on the heatmap
	    chart.svg.append("rect")
	      .attr("class", "selection")
	      .attr("x", p[0])
	      .attr("y", p[1])
	      .attr("width", 1)
	      .attr("height", 1);
	    chart.container.select(".inform")
	      .classed("blocked", true);
	  }
	  var on_mousemove = function(){
	    var s = chart.svg.select(".selection");
	        
	    if(!s.empty()) {
	      var p = d3.mouse(this);

	      s.attr("x", d3.min([p[0], downThis[0]]))
	        .attr("y", d3.min([downThis[1], p[1]]))
	        .attr("width", Math.abs(downThis[0] - p[0]))
	        .attr("height", Math.abs(downThis[1] - p[1]));
	        
	      // deselect all temporary selected state objects
	      d3.selectAll('.tmp-selection.selected')
	        .classed("selected", false);

	      //here we need to go through all layers
	      var selPoints = chart.findPoints(
	        [+s.attr("x") - chart.get_margin().left, +s.attr("y") - chart.get_margin().top], 
	        [+s.attr("x") + +s.attr("width") - chart.get_margin().left, +s.attr("y") + +s.attr("height") - chart.get_margin().top]
	      );
	      if(typeof selPoints.empty === "function")
	        selPoints = [selPoints];

	      for(var i = 0; i < selPoints.length; i++)
	        selPoints[i]
	          .filter(function() {return !d3.select(this).classed("selected")})
	          .classed("selected", true)
	          .classed("tmp-selection", true)
	          .each(function(dp){
	            chart.svg.select(".col").selectAll(".label")
	              .filter(function(label_d) {return label_d == dp.col;})            
	                .classed("tmp-selection", true)
	                .classed("selected", true);
	            chart.svg.select(".row").selectAll(".label")
	              .filter(function(label_d) {return label_d == dp.row;})            
	                .classed("tmp-selection", true)
	                .classed("selected", true);
	          });
	    }
	  }

	  var on_mouseup = function(){
	    var mark = d3.event.shiftKey;
	    // remove selection frame
	    chart.container.select(".inform")
	      .classed("blocked", false);

	    var x = chart.svg.selectAll("rect.selection").attr("x") * 1,
	      y = chart.svg.selectAll("rect.selection").attr("y") * 1,
	      w = chart.svg.selectAll("rect.selection").attr("width") * 1,
	      h = chart.svg.selectAll("rect.selection").attr("height") * 1,
	      lu = [x - chart.get_margin().left, y - chart.get_margin().top], 
	      rb = [x + w - chart.get_margin().left, y + h - chart.get_margin().top],
	      points = d3.select(this),
	      pos = d3.mouse(this);
	    chart.svg.selectAll("rect.selection").remove();
	    pos[0] = pos[0] - chart.get_margin().left;
	    pos[1] = pos[1] - chart.get_margin().top;

	    if(wait_click && getEuclideanDistance(down, d3.mouse(document.body)) < tolerance){
	      window.clearTimeout(wait_click);
	      wait_click = null;
	      if(wait_dblClick && 
	        getEuclideanDistance(click_coord, d3.mouse(document.body)) < tolerance
	      ){
	        //console.log("doubleclick");
	        window.clearTimeout(wait_dblClick);
	        wait_dblClick = null;
	        points.on("dblclick").apply(points, [mark]);
	      } else {
	        wait_dblClick = window.setTimeout((function(e) {
	          return function() {
	            points.on("click").call(points, pos, mark);
	            wait_dblClick = null;
	          };
	        })(d3.event), 300);
	      }
	      click_coord = d3.mouse(document.body);
	      return;
	    }
	    // remove temporary selection marker class
	    if(mark)
	      chart.mark(chart.svg.selectAll(".selected"));
	    chart.svg.selectAll(".tmp-selection")
	      .classed("tmp-selection",false)
	      .classed("selected", false)
	    if(!mark)
	      chart.zoom(lu, rb);      
	  }
	  var on_dblclick = function(mark){
	    mark ? chart.mark("__clear__") : chart.resetDomain();
	  }
	  var on_panelClick = function(p, mark){
	    var clickedPoints = chart.findPoints(p, p);
	    if(typeof clickedPoints.empty === "function")
	      clickedPoints = [clickedPoints];
	    var i = 0;
	    while(i < clickedPoints.length && clickedPoints[i].empty())
	      i++;

	    if(i < clickedPoints.length){
	      if(!mark){
	        var click = clickedPoints[i].on("click");
	        click.call(clickedPoints[i].node(), clickedPoints[i].datum()); 
	      } else {
	        chart.mark(clickedPoints[i]);
	      }
	    }
	  }

	  chart.svg
	    .on("mousedown", on_mousedown)
	    .on("mousemove", on_mousemove)
	    .on("mouseup", on_mouseup)
	    .on("dblclick", on_dblclick)
	    .on("click", on_panelClick);
	      
	  return chart;
	}

	function pearsonCorr( v1, v2 ) {
	   var sum1 = 0;
	   var sum2 = 0;
	   for( var i = 0; i < v1.length; i++ ) {
	      sum1 += v1[i];
	      sum2 += v2[i];
	   }
	   var mean1 = sum1 / v1.length;
	   var mean2 = sum2 / v2.length;
	   var cov = 0
	   var var1 = 0
	   var var2 = 0
	   for( var i = 0; i < v1.length; i++ ) {
	      cov += ( v1[i] - mean1 ) * ( v2[i] - mean2 );
	      var1 += ( v1[i] - mean1 ) * ( v1[i] - mean1 );
	      var2 += ( v2[i] - mean2 ) * ( v2[i] - mean2 );
	   } 
	   return cov / Math.sqrt( var1 * var2 );
	} 

	function wrapText(text, width, height, minSize, maxSize, fontRatio){
	  var splitBy = function(text, symbol){
	    var spl = text.split(symbol);
	    if(spl[spl.length - 1] == "")
	      spl.pop();
	    if(spl.length == 1) return;
	    var mult = 0, bestSep, leftSide = 0,
	      rightSide = text.length;
	    for(var i = 0; i < spl.length - 1; i++){
	      leftSide += (spl[i].length + 1);
	      rightSide -= (spl[i].length + 1);
	      if(mult < leftSide * rightSide){
	        mult = leftSide *  rightSide;
	        bestSep = i;
	      }
	    }
	    return [spl.slice(0, bestSep + 1).join(symbol) + symbol, 
	            spl.slice(bestSep + 1, spl.length - bestSep).join(symbol)];
	  }

	  var splitByVowel = function(text){
	    var vowelInd = Array.apply(null, Array(text.length)).map(Number.prototype.valueOf,0),
	      vowels = ["a", "A", "o", "O", "e", "E", "u", "U", "i", "I"];
	    
	    for(var i = 0; i < text.length; i++)
	      if(vowels.indexOf(text[i]) != -1)
	        vowelInd[i] = 1;
	    for(var i = 0; i < vowelInd.length - 1; i++)
	      vowelInd[i] = (vowelInd[i] - vowelInd[i + 1]) * vowelInd[i];
	    vowelInd[vowelInd.length - 1] = 0;
	    vowelInd[vowelInd.length - 2] = 0;
	    if(vowelInd.indexOf(1) == -1)
	      return [text.substring(0, Math.ceil(text.length / 2)) + "-", 
	              text.substring(Math.ceil(text.length / 2))];
	    var mult = 0, bestSep;
	    for(var i = 0; i < text.length; i++)
	      if(vowelInd[i] == 1)
	        if(mult < (i + 2) * (text.length - i - 1)){
	          mult = (i + 2) * (text.length - i - 1);
	          bestSep = i;
	        }

	      return [text.substring(0, bestSep + 1) + "-", 
	              text.substring(bestSep + 1)];
	  }

	  if(typeof minSize === "undefined")
	    minSize = 8;
	  if(typeof maxSize === "undefined")
	    maxSize = 13;
	  if(typeof fontRatio === "undefined")
	    fontRatio = 0.6;
	  var fontSize = d3.min([height, maxSize]),
	    spans = [text], maxLength = text.length,
	    allowedLength, longestSpan = 0,
	    mult, br;

	  while(maxLength * fontSize * fontRatio > width && fontSize >= minSize){
	    if(maxLength == 1)
	      fontSize = width / fontRatio * 0.95
	    else {
	      if(height / (spans.length + 1) < width / (maxLength * fontRatio) * 0.95)
	        fontSize = width / (maxLength * fontRatio) * 0.95
	      else {
	        var charachters = [" ", ".", ",", "/", "\\", "-", "_", "+", "*", "&", "(", ")", "?", "!"],
	          spl, i = 0;
	        while(typeof spl === "undefined" && i < charachters.length){
	          spl = splitBy(spans[longestSpan], charachters[i]);
	          i++;
	        }
	        if(typeof spl === "undefined")
	          spl = splitByVowel(spans[longestSpan]);
	        spans.splice(longestSpan, 1, spl[0], spl[1]);

	        allowedLength = Math.floor(width / (fontSize * fontRatio));

	        for(var i = 0; i < spans.length - 1; i++)
	          if(spans[i].length + spans[i + 1].length <= allowedLength &&
	              spans[i].length + spans[i + 1].length < maxLength){
	            spans.splice(i, 2, spans[i] + spans[i + 1]);
	            fontSize = d3.min([height / (spans.length - 1), maxSize]);
	            allowedLength = Math.floor(width / (fontSize * fontRatio));
	          }

	        fontSize = d3.min([height / spans.length, maxSize]);
	        maxLength = spans[0].length;
	        longestSpan = 0;
	        for(var i = 1; i < spans.length; i++)
	          if(spans[i].length > maxLength){
	            maxLength = spans[i].length;
	            longestSpan = i;
	          }
	      }
	    }     
	  }

	 // fontSize = d3.min([height / spans.length, width / (maxLength * fontRatio)]);

	  return {spans: spans, fontSize: fontSize};
	}

	function fillTextBlock(g, width, height, text, minSize, maxSize, fontRatio){
	  var fit = wrapText(text, width, height, minSize, maxSize, fontRatio),
	    spans = g.selectAll("text").data(d3.range(fit.spans.length));
	    spans.exit().remove();
	    spans.enter().append("text")
	      .merge(spans)
	        .attr("class", "plainText")
	        .attr("text-anchor", "left")
	        .attr("font-size", fit.fontSize)
	        .attr("y", function(d) {return (d + 1) * fit.fontSize;})
	        .text(function(d) {return fit.spans[d]});
	}

	function get_symbolSize(type, r) {
	  var sizeCoef = {
	    "Circle": 28.2,
	    "Cross": 35,
	    "Diamond": 46,
	    "Square": 36,
	    "Star": 47,
	    "Triangle": 44,
	    "Wye": 37
	  };

	  return Math.pow(r * 28.2 / sizeCoef[type], 2) * 3.14;
	}

	function layerBase(id) {
		
		var layer = base()
	    .add_property("npoints")
	    .add_property("dataIds")
			.add_property("pointMouseOver", function() {})
			.add_property("pointMouseOut", function() {})
			.add_property("on_click", function() {})
			.add_property("layerDomainX")
			.add_property("layerDomainY")
			.add_property("contScaleX", true)
			.add_property("contScaleY", true)
	    .add_property("colour", function(id) {
	      return layer.colourScale(layer.get_colourValue(id));
	    })
	    .add_property("addColourScaleToLegend", true)
	    .add_property("palette")
	    .add_property("colourRange")
	    .add_property("colourValue", undefined)
			.add_property("dresser", function(){});

		layer.id = id;

	  layer.dataIds( "_override_", "npoints", function(){
	    return layer.get_dataIds().length;
	  });
	  layer.npoints( "_override_", "dataIds", function() {
	    return d3.range( layer.get_npoints() );
	  });
	  layer.colour( "_override_", "addColourScaleToLegend", false );

	  layer.colourRange(function() {
	    var ids = layer.get_dataIds();
	    if(layer.get_colourValue(ids[0]) !== undefined){
	      var range = [];
	      for(var i = 0 ; i < ids.length; i++)
	        //colour range can contain only unique values
	        if(range.indexOf(layer.get_colourValue(ids[i])) == -1)
	          range.push(layer.get_colourValue(ids[i]));

	      return range;
	    }
	  });

	  layer.colourScale = function(){
	    return "black";
	  }

	  layer.resetColourScale = function() {
	    var range = layer.get_colourRange();
	    if(range === undefined)
	      return;
	    //first of all, let's check if the colour scale supposed to be
	    //categorical or continuous
	    var allNum = true;
	    for(var i = 0; i < range.length; i++)
	      allNum = allNum && typeof range[i] === "number";
	    if(allNum)
	      range.sort(function(a, b) {return a - b});
	    if(allNum){
	      //the scale is continuous
	      //Now look at the palette
	      if(typeof layer.get_palette() == "undefined")
	        if(d3.interpolateSpectral)
	          layer.palette(d3.interpolateSpectral)
	        else
	          layer.palette(["red", "yellow", "green", "blue"]);
	      //if palette is an array of colors, make a linear colour scale using all
	      //values of the palette as intermideate points
	      if(layer.get_palette().splice){
	        var palette = layer.get_palette();
	        if(palette.length != range.length)
	          range = [d3.min(range), d3.max(range)];
	        if(palette.length == 1)
	          palette.push(palette[0]);
	        if(palette.length > range.length){
	          var newRange = [];
	          for(var i = 0; i < palette.length; i++)
	            newRange.push(range[0] + i*(range[1] - range[0]) / (palette.length - 1));
	          range = newRange; 
	        }
	        //now palette and range have exactly the same number of elements
	        layer.colourValueScale = d3.scaleLinear()
	          .domain(range)
	          .range(palette);
	        layer.colourScale = function(val) {
	          return layer.colourValueScale(val);
	        }
	      } else {
	        //palette is a d3.scale or d3.interpolator
	        range = [d3.min(range), d3.max(range)];
	        //if palette has a domain - use it, otherwise set a domain to
	        //[0, 1] (used in d3. interpolators)
	        var pDomain = [0, 1];
	        if(layer.get_palette().domain)
	          pDomain = layer.get_palette().domain();

	        layer.colourValueScale = d3.scaleLinear()
	          .domain(range)
	          .range(pDomain);
	        layer.colourScale = function(val) {
	          return layer.get_palette(layer.colourValueScale(val));
	        }
	      }
	    } else {
	      //the colour scale is categorical
	      if(typeof layer.get_palette() === "undefined")
	        layer.palette(["#000"].concat(d3.schemeCategory10));
	      if(layer.get_palette().length){
	        var palette = layer.get_palette();
	        //just make sure that palette has enough elements to provide
	        //colour to each object type
	        var paletteLength = palette.length;
	        for(var i = 0; i < range.length - paletteLength; i++)
	          palette.push(palette[i % paletteLength]);

	        layer.colourValueScale = d3.scaleOrdinal()
	          .domain(range)
	          .range(palette);      
	        layer.colourScale = function(val) {
	          return layer.colourValueScale(val);
	        }
	      } else {
	        var pDomain = [0, 1];
	        if(layer.get_palette().domain)
	          pDomain = layer.get_palette().domain();

	        layer.colourValueScale = d3.scalePoint()
	          .domain(range)
	          .range(pDomain);        
	        layer.colourScale = function(val) {
	          return layer.get_palette(layer.colourValueScale(val));
	        }
	      } 
	    }

	    layer.colourScale.domain = layer.get_colourRange;
	    if(layer.chart.showLegend())
	      layer.addLegend(layer.colourScale, "colour", layer.id);
	  }

	  layer.legendBloccks = [];

	  layer.addLegend = function(scale, type, id){
	    layer.chart.legend.add(scale, type, id, layer);
	    layer.legendBloccks.push(id);

	    return layer; 
	  }

		layer.update = function() {
	    
	    layer.updatePoints();
	    layer.updatePointStyle();
	    layer.updatePointLocation();

	    return layer;
	  };

		layer.put_static_content = function() {
	    layer.g = layer.chart.svg.append("g")
	      .attr("class", "chart_g")
	      .attr("id", layer.id)
	      .attr("clip-path", "url(#viewBox)");
	    //layer.chart.svg.select(".clickPanel").raise();
		};
		
		layer.afterUpdate = function(){};
	  
	  layer.updateSize = function(){
	    if(typeof layer.chart.transition !== "undefined"){
	      layer.g.transition(layer.chart.transition)
	        .attr("transform", "translate(" + 
	          layer.chart.get_margin().left + ", " +
	          layer.chart.get_margin().top + ")");
	      layer.g.selectAll(".data_point")
	    } else {
	      layer.g
	        .attr("transform", "translate(" + 
	          layer.chart.get_margin().left + ", " +
	          layer.chart.get_margin().top + ")");
	    }
	    return layer;
	  }
	  layer.updatePoints = function() {
	  };
	  layer.updatePointStyle = function() {
	    layer.resetColourScale();
	  	layer.get_dresser(layer.g.selectAll(".data_point"));
	  	return layer;
	  };
	  layer.updatePointLocation = function() {};
	  layer.findPoints = function() {return layer.g.select("___");}; //return empty selection	
		
		return layer;
	}

	function legend(chart) {
		var legend = base()
			.add_property("width", 200)
			.add_property("height", function() {return chart.height();})
			.add_property("sampleHeight", 20)
			.add_property("ncol", undefined)
			.add_property("location");

		legend.blocks = {};
		legend.chart = chart;

		legend.add = function(scale, type, id, layer){
			//scale can be an array or d3 scale. If scale is an array,
			//we need to turn it into a scale
			var block = {};
			if(typeof scale === "function")
				block.scale = scale
			else
				block.scale = function() {return scale;};
			if(typeof layer !== "undefined")
				block.layer = layer;
			if(["colour", "size", "style", "symbol", "dash"].indexOf(type) == -1)
				throw "Error in 'legend.add': " + type + " is not a suitable type of legend block. " +
					"Please, use one of these: 'colour', 'size', 'symbol', 'dash'";
			block.type = type;

			legend.blocks[id] = block;
			legend.updateGrid();

			return legend.chart;
		}

		legend.updateScale = function(scale, id){
			if(typeof legend.blocks[id] === "undefined")
				throw "Error in 'legend.updateScale': A block with ID " + id +
					" is not defined";
			legend.blocks[id].scale = scale;
			legend.updateBlock(id);

			return legend.chart;
		}

		legend.convertScale = function(id) {
			var scale, newScale;
			if(typeof legend.blocks[id].scale === "function")
				scale = legend.blocks[id].scale();
			if(typeof scale === "undefined" || 
					(typeof scale !== "function" && typeof scale.splice === "undefined"))
				scale = legend.blocks[id].scale;
			
			if(typeof scale !== "function"){
				var scCont = false,
					rCont = false;
				if(scale.length == 1)
					throw "Error in 'legend.add': range of the scale is not defined.";
				if(scale[0].length == 2 && typeof scale[0][0] === "number" && 
																	typeof scale[0][1] === "number")
					scCont = true;
				if(legend.blocks[id].type == "colour" && scale[0].length != scale[1].length)
					rCont = true;
				if(scale[1].length == 2 && typeof scale[0][0] === "number" && 
																	typeof scale[0][1] === "number")
					rCont = true;
				if(scCont && rCont){
					newScale = d3.scaleLinear()
						.domain(scale[0])
						.range(scale[1]);
					scale.steps ? newScale.steps = scale.steps : newScale.steps = 9;
				}
				if(scCont && !rCont){
					newScale = d3.scaleQuantize()
						.domain(scale[0])
						.range(scale[1]);
					newScale.steps = scale[1].length;
				}
				if(!scCont && rCont){
					newScale = d3.scalePoint()
						.domain(scale[0])
						.range(scale[1]);
					newScale.steps = scale[0].length;
				}
				if(!scCont && !rCont){
					if(scale[0].length > scale[1].length)
						scale[0].splice(scale[1].length);
					if(scale[1].length > scale[0].length)
						scale[1].splice(scale[0].length);
					newScale = d3.scaleOrdinal()
						.domain(scale[0])
						.range(scale[1]);
					newScale.steps = scale[0].length;				
				}
				legend.blocks[id].domain = scale[0];
				if(typeof newScale.domain === "undefined")
					newScale.domain = legend.blocks[id].domain;
			} else {
				//scale is a function it is either a d3 scale or it has a domain property
				if(typeof scale !== "function")
					throw "Error in 'legend.add': the type of scale argument is not suported. " +
						"Scale should be an array or a function."
				var domain;
				typeof scale.domain === "function" ? domain = scale.domain() : domain = scale.domain;
				if(typeof domain === "undefined")
					throw "Error in 'legend.add': the domain of the scale is not defined.";
				legend.blocks[id].domain = domain;
				newScale = scale;
				if(scale.steps)
					newScale.steps = scale.steps
				else {
					domain.length == 2 ? newScale.steps = 9 : newScale.steps = domain.length;
				} 
			}
			return newScale;
		}

		legend.remove = function(id) {
			if(typeof legend.blocks[id] === "undefined")
				throw "Error in 'legend.remove': block with ID " + id +
				" doesn't exist";
			if(typeof legend.blocks[id].layer !== "undefined")
				legend.blocks[id].layer.legendBlocks.splice(
					legend.blocks[id].layer.legendBlocks.indexOf(id), 1
				);
			delete legend.blocks[id];
			legend.g.select("#" + id).remove();
			legend.updateGrid();

			return legend.chart;
		}

		legend.rename = function(oldId, newId) {
			legend.blocks[newId] = legendBlocks.blocks[oldId];
			delete legend.blocks[oldId];
			if(typeof legend.blocks[newId].layer !== "undefined")
				legend.blocks[newId].layer.legendBlocks.splice(
					legend.blocks[newId].layer.legendBlocks.indexOf(oldId), 1, newId
				);
			legend.g.select("#" + oldId)
				.attr("id", newId);
			legend.update();

			return legend.chart;
		}
		legend.updateGrid = function() {
			//define optimal layout for all the blocks
			//and create a table
			var bestWidth, bestHeight,
				n = Object.keys(legend.blocks).length;

			if(typeof legend.ncol() === "undefined"){
				var minSum = 1 + n, j;
				bestHeight = 1; 
				for(var i = 2; i <= Math.ceil(Math.sqrt(n)); i++){
					j =  Math.ceil(n / i);
					if(i + j <= minSum){
						minSum = i + j;
						bestHeight = i;
					}
				}
				bestWidth = Math.ceil(n / bestHeight);
			} else {
				bestWidth = legend.ncol();
				bestHeight = Math.ceil(n / bestWidth);
			}
			legend.location().select(".legendTable").remove();
			legend.location().append("table")
				.attr("class", "legendTable")
				.selectAll("tr").data(d3.range(bestHeight))
					.enter().append("tr");
			legend.location().selectAll("tr").selectAll("td")
				.data(function(d) {
					return d3.range(bestWidth).map(function(e) {
						return [d, e];
					})
				})	
				.enter().append("td")
					.attr("id", function(d) {
						try{
							return Object.keys(legend.blocks)[d[0] * bestWidth + d[1]]
											.replace(/ /g, "_");
						} catch(exc) {return undefined;}
					});
			for(var i in legend.blocks)
				legend.updateBlock(i);
		}


		legend.updateBlock = function(id){
			if(typeof legend.blocks[id] === "undefined")
				throw "Error in 'legend.updateBlock': block with ID " + id +
					" is not defined";

			var scale = legend.convertScale(id),
				tableCell = legend.location().select("#" + id.replace(/ /g, "_")),
				cellWidth = legend.width() / legend.location().select("tr").selectAll("td").size(),
				steps = scale.steps,
				cellHeight = legend.sampleHeight() * steps;

			var blockSvg = tableCell.selectAll("svg");
			if(blockSvg.empty())
				blockSvg = tableCell.append("svg");
			blockSvg.attr("width", cellWidth)
				.attr("height", cellHeight);
		
			var title = blockSvg.select(".title");
			if(title.empty())
				title = blockSvg.append("g")
					.attr("class", "title");
			var titleWidth = d3.min([20, cellWidth * 0.2]);
			fillTextBlock(title, cellHeight, titleWidth, id);
			title.attr("transform", "rotate(-90)translate(-" + cellHeight + ", 0)");

			var sampleValues;
			if(legend.blocks[id].domain.length == steps)
				sampleValues = legend.blocks[id].domain;
			else
				sampleValues = d3.range(steps).map(function(e) {
					return legend.blocks[id].domain[0] + e * 
									(legend.blocks[id].domain[1] - legend.blocks[id].domain[0]) / 
									(steps - 1)
				})
			var sampleData = [];
			for(var i = 0; i < sampleValues.length; i++)
				sampleData.push([sampleValues[i]]);
			
			var samples = blockSvg.selectAll(".sample").data(sampleData);
			samples.exit().remove();
			samples.enter().append("g")
				.attr("class", "sample")
				.merge(samples)
					.attr("transform", function(d, i) {
						return "translate(" + (titleWidth + 1) + ", " + 
										(i * legend.sampleHeight()) + ")";
					});

			if(legend.blocks[id].type == "colour"){
				var rect = blockSvg.selectAll(".sample").selectAll("rect").data(function(d){
					return d;
				});
				rect.enter().append("rect")
					.merge(rect)
						.attr("width", titleWidth)
						.attr("height", legend.sampleHeight())
						.attr("fill", function(d) {return scale(d)});
			}
			if(legend.blocks[id].type == "symbol"){
				var size = d3.min([legend.sampleHeight() / 2, 
														titleWidth / 2]);
				var symbols = blockSvg.selectAll(".sample").selectAll("path").data(function(d){
					return d;
				});
				symbols.enter().append("path")
					.merge(symbols)
						.attr("d", function(d) {
							return d3.symbol()
								.type(d3["symbol" + scale(d)])
								.size(get_symbolSize(scale(d), size))();
						})
						.attr("transform", "translate(" + size + ", " + size + ")");
			}
			if(legend.blocks[id].type == "dash"){
				var lines = blockSvg.selectAll(".sample").selectAll("line").data(function(d){
					return d;
				});
				lines.enter().append("line")
					.style("stroke", "black")
				 	.merge(lines)
				 		.attr("x1", 0)
				 		.attr("x2", titleWidth)
				 		.attr("y1", legend.sampleHeight() / 2)
				 		.attr("y2", legend.sampleHeight() / 2)
				 		.attr("stroke-dasharray", function(d) {return scale(d)});
			}

			var sampleText = blockSvg.selectAll(".sample").selectAll("g").data(function(d){
				return (typeof d[0] === "number") ? [d[0].toString()] : d;
			});
			sampleText.enter().append("g")
				.merge(sampleText)
					.attr("transform", "translate(" + (titleWidth + 5) + ", 0)");
			blockSvg.selectAll(".sample").selectAll("g").each(function(d) {
				fillTextBlock(d3.select(this), cellWidth - 2 * titleWidth - 5, 
												legend.sampleHeight(), d
											);
			});		
		}
		legend.update = function() {
			legend.updateGrid();
		}

		return legend;
	}

	function scatterChart(id, chart) {

		if(chart === undefined)
			chart = axisChart();
		if(id === undefined)
			id = "layer" + chart.get_nlayers();

	  var layer = chart.create_layer(id).get_layer(id)
			.add_property("x")
			.add_property("y")
	    .add_property("size", 6)
	    .add_property("stroke", function(d) {
	      return d3.rgb(layer.get_colour(d)).darker(0.8)
	    })
	    .add_property("strokeWidth", function(d) {
	      return layer.get_size(d) * 0.1;
	    })
	    .add_property("symbolType", "Circle")
			.add_property("groupName", function(i){return i;});
		chart.syncProperties(layer);

	  layer.type = "scatterChart";

	  // Set default for numPoints, namely to count the data provided for x
	  layer.npoints( function() {
	    var val;
	    for( var i = 0; i < 10000; i++ ) {
	      try {
	        // try to get a value
	        val = layer.get_x(i)
	      } catch( exc ) {
	        // if call failed with exception, report the last successful 
	        // index, if any, otherwise zero
	        return i > 0 ? i-1 : 0;  
	      }
	      if( val === undefined ) {
	        // same again: return last index with defines return, if any,
	        // otherwise zero
	        return i > 0 ? i-1 : 0;  
	      }
	    }
	    // If we exit the loop, there is either something wrong or there are
	    // really many points
	    throw "There seem to be very many data points. Please supply a number via 'npoints'."
	  });

	  //default hovering behaviour
	  layer.pointMouseOver(function(d){
	    //change colour and class
	    d3.select(this)
	      .attr("fill", function(d) {
	        return d3.rgb(layer.get_colour(d)).darker(0.5);
	      })
	      .classed("hover", true);
	    //show label
	    layer.chart.container.select(".inform")
	        .style("left", (d3.event.pageX + 10) + "px")
	        .style("top", (d3.event.pageY - 10) + "px")
	        .select(".value")
	          .html("ID: <b>" + d + "</b>;<br>" + 
	            "x = " + layer.get_x(d).toFixed(2) + ";<br>" + 
	            "y = " + layer.get_y(d).toFixed(2));  
	    layer.chart.container.select(".inform")
	      .classed("hidden", false);
	  });
	  layer.pointMouseOut(function(d){
	    d3.select(this)
	      .attr("fill", function(d) {
	        return layer.get_colour(d);
	      })
	      .classed("hover", false);
	    layer.chart.container.select(".inform")
	      .classed("hidden", true);
	  });


	  //These functions are used to react on clicks
	  layer.findPoints = function(lu, rb){
	    return layer.g.selectAll(".data_point")
	      .filter(function(d) {
	        var loc = [layer.chart.axes.scale_x(layer.chart.get_x(d)), 
	                  layer.chart.axes.scale_y(layer.get_y(d))]
	        return (loc[0] - layer.get_size(d) <= rb[0]) && 
	          (loc[1] - layer.get_size(d) <= rb[1]) && 
	          (loc[0] + layer.get_size(d) >= lu[0]) && 
	          (loc[1] + layer.get_size(d) >= lu[1]);
	      });
	  }

		layer.layerDomainX(function() {
			if(layer.get_contScaleX()){
	      return d3.extent( layer.get_dataIds(), function(k) { return layer.get_x(k) } )
	    } else {
	      return layer.get_dataIds().map(function(e) { return layer.get_x(e);});
	    }
		});
		layer.layerDomainY(function() {
	    if(layer.get_contScaleY()) {
			  return d3.extent( layer.get_dataIds(), function(k) { return layer.get_y(k) } )
	    } else{
	      return layer.get_dataIds().map(function(e) { return layer.get_y(e);});
	    }
		});

	  layer.updatePointLocation = function(){
	    if(typeof layer.chart.transition !== "undefined"){
	      layer.g.selectAll(".data_point").transition(layer.chart.transition)
	        .attr("transform", function(d) {
	          return "translate(" + layer.chart.axes.scale_x( layer.get_x(d) ) + ", " + 
	          layer.chart.axes.scale_y( layer.get_y(d) ) + ")"
	        });
	    } else {
	      layer.g.selectAll(".data_point")
	        .attr("transform", function(d) {
	          return "translate(" + layer.chart.axes.scale_x( layer.get_x(d) ) + ", " + 
	          layer.chart.axes.scale_y( layer.get_y(d) ) + ")"
	        });
	    }
	    return layer;
	  }

	  layer.updateSelPointStyle = function(id){
	    if(typeof id.length === "undefined")
	      id = [id];
	    if(typeof layer.chart.transition !== "undefined")
	      for(var i = 0; i < id.length; i++)
	        layer.g.select("#p" + id[i]).transition(chart.layer.transition)
	          .attr( "r", function(d) {return layer.get_size(d)})
	          .attr( "fill", function(d) { return layer.get_colour(d)})
	          .attr( "style", function(d) { return layer.get_style(d)})
	    else
	      for(var i = 0; i < id.length; i++)
	        layer.g.select("#p" + id[i])
	          .attr( "r", layer.get_size(id[i]))
	          .attr( "fill", layer.get_colour(id[i]))
	          .attr( "style", layer.get_style(id[i]));      
	    return layer;
	  }

	  layer.updatePointStyle = function() {
	    layer.resetColourScale();
	    var ids = layer.get_dataIds();
	    if(typeof layer.chart.transition !== "undefined")
	      layer.g.selectAll(".data_point").transition(layer.chart.transition)
	        .attr("d", function(d) {
	          return d3.symbol()
	            .type(d3["symbol" + layer.get_symbolType(d)])
	            .size(get_symbolSize(layer.get_symbolType(d), layer.get_size(d)))();
	        })
	        .attr("fill", function(d) {return layer.get_colour(d)})
	        .attr("stroke", function(d) {return layer.get_stroke(d)})
	        .attr("stroke-width", function(d) {return layer.get_strokeWidth(d)})
	    else
	      layer.g.selectAll(".data_point")
	        .attr("d", function(d) {return symbolSet[d]()})
	        .attr("fill", function(d) {return layer.get_colour(d)})
	        .attr("stroke", function(d) {return layer.get_stroke(d)})
	        .attr("stroke-width", function(d) {return layer.get_strokeWidth(d)});
	  }

	  layer.dresser(function(sel) {
	    sel.attr("fill", function(d) {return layer.get_colour(d);})
	      .attr("r", function(d) {return layer.get_size(d);});
	  });

	  layer.updatePoints = function(){
	    var sel = layer.g.selectAll( ".data_point" )
	      .data( layer.get_dataIds(), function(d) {return d;} );
	    sel.exit()
	      .remove();  
	    sel.enter().append( "path" )
	      .attr( "class", "data_point" )
	      .merge(sel)
	        .on( "click", layer.get_on_click )
	        .on( "mouseover", layer.get_pointMouseOver )
	        .on( "mouseout", layer.get_pointMouseOut );
	  }

	  return chart;
	}

	function lineChart(id, chart){
		
		if(chart === undefined)
			chart = axisChart();
		if(id === undefined)
			id = "layer" + chart.get_nlayers();
		
		var layer = chart.create_layer(id).get_layer(id)
			.add_property("lineFun")
			.add_property("lineStepNum", 100)
			.add_property("lineWidth", 1.5)
			.add_property("dasharray", undefined);
		chart.syncProperties(layer);

		layer.type = "lineChart";
		
		layer.updatePoints = function(){
			var lines = layer.g.selectAll(".data_point")
				.data(layer.get_dataIds(), function(d) {return d;});
			lines.exit()
				.remove();
			lines.enter()
				.append("path")
					.attr("class", "data_point")
					.attr("fill", "none")
				.merge(lines)
	        .on( "click", layer.get_on_click )
	        .on( "mouseover", layer.get_pointMouseOver )
	        .on( "mouseout", layer.get_pointMouseOut );			
		};

		layer.dresser(function(sel){
			sel.attr("stroke", function(d) {return layer.get_colour(d);})
				.attr("stroke-width", function(d) {return layer.get_lineWidth(d);})
				.attr("stroke-dasharray", function(d) {return layer.get_dasharray(d)});
		});

		layer.updatePointLocation = function(){
			//define the length of each step
			var lineStep = (layer.chart.axes.scale_x.domain()[1] - 
											layer.chart.axes.scale_x.domain()[0]) / 
											layer.get_lineStepNum();
			var get_data = function(d){
				var lineData = [];
				for(var i = layer.chart.axes.scale_x.domain()[0]; 
						i < layer.chart.axes.scale_x.domain()[1]; i += lineStep)
				lineData.push({
					x: i,
					y: layer.get_lineFun(d, i)
				});
								
				var line = d3.line()
					.x(function(c) {return layer.chart.axes.scale_x(c.x);})
					.y(function(c) {return layer.chart.axes.scale_y(c.y);});
								
				return line(lineData);
			};
			
			if(typeof layer.chart.transition !== "undefined")
				layer.g.selectAll(".data_point").transition(layer.chart.transition)
					.attr("d", get_data)
			else
				layer.g.selectAll(".data_point")
					.attr("d", get_data);			
		};

		return layer;
	}

	//basic chart object
	function chartBase() {
		var chart = base()
			.add_property("width", 500)
			.add_property("height", 500)
			.add_property("plotWidth", 440)
			.add_property("plotHeight", 440)
			.add_property("margin", { top: 15, right: 10, bottom: 50, left: 50 })
			.add_property("title", "")
			.add_property("titleX", function() {return chart.width() / 2;})
			.add_property("titleY", function() {return d3.min([17, chart.margin().top * 0.9]);})
			.add_property("titleSize", function() {return d3.min([15, chart.margin().top * 0.8]);})
			.add_property("transitionDuration", 1000)
			.add_property("markedUpdated", function() {}); //may be set to zero
		
		chart.transition = undefined;
	  chart.width("_override_", "plotWidth", function(){
	  			return chart.get_width() - 
	  				(chart.get_margin().right + chart.get_margin().left);
	  });
	/*  chart.plotWidth("_override_", "width", function(){
	  			return chart.get_plotWidth() +
	  				(chart.get_margin().right + chart.get_margin().left);
	  }); */
	  chart.margin("_override_", "plotWidth", function(){
	  			return chart.get_width() - 
	  				(chart.get_margin().right + chart.get_margin().left);
	  });
	  chart.height("_override_", "plotHeight", function(){
	  			return chart.get_height() - 
	  				(chart.get_margin().top + chart.get_margin().bottom);
	  });
	 /* chart.plotHeight("_override_", "height", function(){
	  			return chart.get_plotHeight() +
	  				(chart.get_margin().top + chart.get_margin().bottom);
	  }); */
	  chart.margin("_override_", "plotHeight", function(){
	  			return chart.get_height() - 
	  				(chart.get_margin().top + chart.get_margin().bottom);
	  });

	  chart.set_margin = function(margin){
	  	if(typeof margin.top === "undefined")
	  		margin.top = chart.margin().top;
	  	if(typeof margin.bottom === "undefined")
	  		margin.bottom = chart.margin().bottom;
	  	if(typeof margin.left === "undefined")
	  		margin.left = chart.margin().left;
	  	if(typeof margin.right === "undefined")
	  		margin.right = chart.margin().right;
	  	
	  	chart.margin(margin);
	  	return chart;
	  }

	  chart.put_static_content = function( element ) {
			chart.container = element.append("div");
			chart.container.node().ondragstart = function() { return false; };
			chart.svg = chart.container.append("svg");
			chart.viewBox = chart.svg.append("defs")
				.append("clipPath")
					.attr("id", "viewBox")
					.append("rect");
			chart.container.append("div")
				.attr("class", "inform hidden")
				.append("p")
					.attr("class", "value");
			chart.svg.append("text")
				.attr("class", "title plainText")
				.attr("text-anchor", "middle");
		}

		chart.defineTransition = function(){
			chart.transition = 
				d3.transition().duration(chart.transitionDuration());
			chart.transition
				.on("end", chart.defineTransition);
		}

		chart.mark = function(selection) {
			if(selection == "__clear__"){
				chart.svg.selectAll(".data_point.marked")
					.classed("marked", false);
				chart.svg.selectAll(".data_point")
					.attr("opacity", 1);
				chart.markedUpdated();
				return;
			}

			if(chart.svg.selectAll(".data_point.marked").empty())
				chart.svg.selectAll(".data_point")
					.attr("opacity", 0.5);
			selection.classed("switch", true);
			if(selection.size() < 2)
				selection.filter(function() {return d3.select(this).classed("marked");})
					.classed("switch", false)
					.classed("marked", false)
					.attr("opacity", 0.5);
			selection.filter(function() {return d3.select(this).classed("switch");})
				.classed("marked", true)
				.classed("switch", false)
				.attr("opacity", 1);
			if(chart.svg.selectAll(".data_point.marked").empty())
				chart.svg.selectAll(".data_point")
					.attr("opacity", 1);

			chart.markedUpdated();
		}

		chart.afterUpdate = function(){
			if(chart.get_transitionDuration() != 0)
				chart.defineTransition();
		}

	  chart.place = function( element ) {
	    if( element === undefined )
	      element = "body";
	    if( typeof( element ) == "string" ) {
	      var node = element;
	      element = d3.select( node );
	      if( element.size() == 0 )
	        throw "Error in function 'place': DOM selection for string '" +
	          node + "' did not find a node."
	  	}

			chart.put_static_content( element );
	    chart.update();
	    chart.afterUpdate();
	    return chart;
	  }
		
		//update parts
		chart.updateSize = function(){
			chart.viewBox
				.attr("x", -5) //Let's leave some margin for a view box so that not to cut
				.attr("y", -5) //points that are exactly on the edge
				.attr("width", chart.get_plotWidth() + 10) 
				.attr("height", chart.get_plotHeight() + 10);
			if(typeof chart.transition !== "undefined"){
				chart.svg.transition(chart.transition)
					.attr("width", chart.get_width())
					.attr("height", chart.get_height());
				//chart.container.transition(chart.transition)
				//	.style("width", chart.get_width() + "px")
				//	.style("height", chart.get_height() + "px");
				chart.svg.select(".title").transition(chart.transition)
					.attr("font-size", chart.titleSize())
					.attr("x", chart.titleX())
					.attr("y", chart.titleY());
			} else {
				chart.svg
					.attr("width", chart.get_width())
					.attr("height",	chart.get_height());
				//chart.container
				//	.style("width", chart.get_width() + "px")
				//	.style("height", chart.get_height() + "px");
				chart.svg.select(".title")
					.attr("font-size", chart.titleSize())
					.attr("x", chart.titleX())
					.attr("y", chart.titleY());
			}
			return chart;			
		}
		chart.updateTitle = function(){
			chart.svg.select(".title")
				.text(chart.title());		
		}

		chart.update = function(){
			chart.updateSize();
			chart.updateTitle();
			return chart;
		}
	  return chart;
	}

	function layerChartBase(){
		var chart = chartBase()
			.add_property("activeLayer", undefined)
			.add_property("showLegend", true)
			.add_property("layerIds", function() {return Object.keys(chart.layers);})
			.add_property("layerType", function(id) {return chart.get_layer(id).type;});
		
		chart.legend = legend(chart);

		//Basic layer functionality
		chart.layers = {};
		var findLayerProperty = function(propname){
			return function() {
				if(chart.get_activeLayer()[propname])
					return chart.get_activeLayer()[propname].apply(chart, arguments)
				else {
					for(var i in chart.layers)
						if(chart.layers[i][propname])
							return chart.layers[i][propname].apply(chart, arguments);
					return;
				}
			}
		}
		chart.syncProperties = function(layer){
			for(var i = 0; i < layer.propList.length; i++)
				if(typeof chart[layer.propList[i]] === "undefined")
					chart[layer.propList[i]] = findLayerProperty(layer.propList[i]);
		}

		chart.get_nlayers = function() {
			return Object.keys(chart.layers).length;
		}
		chart.get_layer = function(id) {
			if(Object.keys(chart.layers).indexOf(id) == -1)
				throw "Error in 'get_layer': layer with id " + id +
					" is not defined";

			return chart.layers[id];
		}
		chart.create_layer = function(id) {
			if(typeof id === "undefined")
				id = "layer" + chart.get_nlayers();

			var layer = layerBase(id);
			layer.chart = chart;
			chart.layers[id] = layer;
			chart.activeLayer(chart.get_layer(id));

			return chart;
		}
		chart.add_layer = function(id) {
			if(typeof id === "undefined")
				id = "layer" + chart.get_nlayers();

			var type;
			try {
				type = chart.get_layerType(id);
			} catch (exc) {};
			if(typeof type === "undefined"){
				chart.create_layer(id);
			} else {
				if(type == "scatter")
					scatterChart(id, chart);
				if(type == "xLine")
					lineChart(id, chart);
			}
			return chart;
		}
		chart.remove_layer = function(id) {
			if( Object.keys(chart.layers).indexOf(id) == -1)
				return -1;
			//clean the legend
			for(i in chart.layers[id].legendBlocks)
				chart.legend.remove(i);
			try {
				chart.layers[id].g.remove();
			} catch(exc) {};
			delete chart.layers[id];

			return 0;
		}
		chart.select_layers = function(ids) {
			if(typeof ids === "undefined")
				ids = chart.layerIds();

			var layerSelection = {};
			layerSelection.layers = {};
			//extract or initialise all the requested layers
			for(var i = 0; i < ids.length; i++)
				if(chart.layerIds().indexOf(ids[i]) != -1) {
					if(typeof chart.layers[ids[i]] === "undefined"){
						chart.add_layer(ids[i]);
						chart.get_layer(ids[i]).put_static_content();
					}
					layerSelection.layers[ids[i]] = chart.get_layer(ids[i]);
				} else {
					ids.splice(i, 1);
					i--;
				}
			if(Object.keys(layerSelection.layers).length == 0){
				for(i in chart)
					layerSelection[i] = function() {return layerSelection};
				return layerSelection;
			}
			//construct generalised property functions
			//note, that only the properties shared between layers
			//can  be generalized
			var prop, flag, j;
			for(var j = 0; j < ids.length; j++)
				for(var i = 0; i < layerSelection.layers[ids[j]].propList.length; i++){
					prop = layerSelection.layers[ids[j]].propList[i];
					if(typeof layerSelection[prop] === "undefined")
						layerSelection[prop] = (function(prop) {return function(val){
							var vf;
							if(typeof val !== "function")
								vf = function() {return val;}
							else
								vf = val;
							for(var i = 0; i < ids.length; i++)
								if(typeof layerSelection.layers[ids[i]][prop] !== "undefined")
									layerSelection.layers[ids[i]][prop]( (function(id) {return function(){ 
										var args = []
										for(var j = 0; j < arguments.length; j++)
											args.push(arguments[j]);
										args.unshift(id);
										return vf.apply(undefined, args); 
									} })(ids[i]));
							return layerSelection;
						} })(prop);
				}

			return layerSelection;
		}

		chart.findPoints = function(lu, rb){
			var selPoints = [];
			chart.svg.selectAll(".chart_g").each(function(){
				selPoints.unshift(
					chart.get_layer(d3.select(this).attr("id")).findPoints(lu, rb)
				);
			});
			return selPoints;
		}

		chart.placeLayer = function(id){
			chart.get_layer(id).put_static_content();
			chart.get_layer(id).updateSize();
			chart.get_layer(id).update();
		}

		var inherited_put_static_content = chart.put_static_content;
		chart.put_static_content = function(element){
			inherited_put_static_content(element);
			//Redefine svg to put it inside a table
			chart.svg.remove();
			chart.svg = chart.container
				.append("table")
					.append("tr")
						.append("td")
							.append("svg");
			chart.viewBox = chart.svg.append("defs")
				.append("clipPath")
					.attr("id", "viewBox")
					.append("rect");
			chart.svg.append("text")
				.attr("class", "title plainText")
				.attr("text-anchor", "middle");
			//add a cell for the legend
			chart.legend.location(chart.container.select("tr")
														.append("td").attr("id", "legend"));

			add_click_listener(chart);
			for(var k in chart.layers)
				chart.get_layer(k).put_static_content();		
		}

		var inherited_update = chart.update;
		chart.update = function() {
			var ids = chart.layerIds(), type;
			for(var i = 0; i < ids.length; i++){
				if(typeof chart.layers[ids[i]] === "undefined")
					chart.add_layer(ids[i]);
	//			if(typeof chart.layers[ids[i]].g === "undefined")
	//				chart.placeLayer(ids[i]);
			}
			

			for(var k in chart.layers){
				if(ids.indexOf(k) == -1)
					chart.remove_layer(k)
				else {
					chart.get_layer(k).updatePoints();
					chart.get_layer(k).updatePointStyle();
				}	
			}
			
			inherited_update();
			if(chart.showLegend() && Object.keys(chart.legend.blocks).length > 0)
				chart.legend.update();
			return chart;
		}

		var inherited_afterUpdate = chart.afterUpdate;
		chart.afterUpdate = function(){
			inherited_afterUpdate();
			for(var k in chart.layers)
				chart.get_layer(k).afterUpdate();
		}

		var inherited_updateSize = chart.updateSize;
		chart.updateSize = function(){
			inherited_updateSize();
			for(var k in chart.layers)
				chart.get_layer(k).updateSize();
		}

		return chart;
	}

	function axisChart() {
		
		var chart = layerChartBase();
		
		chart.add_property("singleScaleX", true)
			.add_property("singleScaleY", true)
			.add_property("domainX")
			.add_property("domainY")
			.add_property("aspectRatio", null)
			.add_property("labelX")
			.add_property("labelY")
			.add_property("ticksX", undefined)
			.add_property("ticksY", undefined);

		chart.axes = {};
		
		//default getter for domain
		//tries to make domain fit data from all layers
		//for axis capital letters a supposed to be used
		var get_domain = function(axis) {
			return function() {
				var domain;
				//TODO: add possibility of adding several axises
				//(one for each plot.layer)
				if(chart["get_singleScale" + axis]()){
					//if all the layers use continuous scale, make the scale continuous
					//otherwise make it categorical
					var contScale = true;
					for(var k in chart.layers)
						contScale = contScale && chart.get_layer(k)["get_contScale" + axis]();

					if(contScale){//if resulting scale is continous, find minimun and maximum values
						for(var k in chart.layers)
							//some of the layers may not have domains at all (such as legends)
							if(typeof chart.get_layer(k)["get_layerDomain" + axis]() !== "undefined")
								if(typeof domain === "undefined") 
									domain = chart.get_layer(k)["get_layerDomain" + axis]()
								else {
									domain[0] = d3.min([domain[0], chart.get_layer(k)["get_layerDomain" + axis]()[0]]);
									domain[1] = d3.max([domain[1], chart.get_layer(k)["get_layerDomain" + axis]()[1]]);
								}
					} else { //if scale is categorical, find unique values from each layer
						for(var k in chart.layers)
							if(typeof chart.get_layer(k)["get_layerDomain" + axis]() !== "undefined")
								if(typeof domain === "undefined") 
									domain = chart.get_layer(k)["get_layerDomain" + axis]()
								else 
									domain = domain.concat(chart.get_layer(k)["get_layerDomain" + axis]()
										.filter(function(e){
											return domain.indexOf(e) < 0;
										}));
					}
				}
				return domain;
			}
		}

		chart.get_domainX = get_domain("X");
		chart.get_domainY = get_domain("Y");

		//redefine setters for axis domains
		chart.domainX = function(domain){
			//set default getter
			if(domain == "reset"){
				chart.domainX(chart.origDomainX);
				return chart;
			}
			//if user provided function, use this function
			if(typeof domain === "function")
				chart.get_domainX = domain;
			if(domain.splice)
				chart.get_domainX = function() {
					return domain;
				};
				
			return chart;
		}
		chart.domainY = function(domain){
			if(domain == "reset"){
				chart.domainY(chart.origDomainY);
				return chart;
			}
			if(typeof domain === "function")
				chart.get_domainY = domain;
			if(domain.splice)
				chart.get_domainY = function() {
					return domain;
				};
			
			return chart;
		}

		chart.zoom = function(lu, rb){
			if(lu[0] == rb[0] || lu[1] == rb[1])
				return;
	    chart.domainX([chart.axes.scale_x.invert(lu[0]), 
	                        chart.axes.scale_x.invert(rb[0])]);
	    chart.domainY([chart.axes.scale_y.invert(rb[1]),
	                        chart.axes.scale_y.invert(lu[1])]);
	    chart.updateAxes();
	  }
	  chart.resetDomain = function(){
	    chart.domainX("reset");
	    chart.domainY("reset");
	    chart.updateAxes();
	  }

	  var inherited_put_static_content = chart.put_static_content;
	  chart.put_static_content = function( element ) {
	    inherited_put_static_content( element );
			
			var g = chart.svg.append("g")
				.attr("class", "axes_g");

	    chart.axes.x_g = g.append( "g" )
	      .attr( "class", "x axis" );
	    chart.axes.x_label = chart.axes.x_g.append( "text" )
	      .attr( "class", "label" )
	      .attr( "y", -6 )
	      .style( "text-anchor", "end" );

	    chart.axes.y_g = g.append( "g" )
	      .attr( "class", "y axis" )
	    chart.axes.y_label = chart.axes.y_g.append( "text" )
	      .attr( "class", "label" )
	      .attr( "transform", "rotate(-90)" )
	      .attr( "y", 6 )
	      .attr( "dy", ".71em" )
	      .style( "text-anchor", "end" );

			var domainX = chart.get_domainX();
			if(domainX.length == 2 && typeof domainX[0] === "number")
				chart.axes.scale_x = d3.scaleLinear()
					.nice();
			else{
				chart.axes.scale_x = d3.scalePoint()
					.padding(0.3);	
			}
			chart.origDomainX = chart.get_domainX;
			
			var domainY = chart.get_domainY();
			if(domainY.length == 2 && typeof domainY[0] === "number")
				chart.axes.scale_y = d3.scaleLinear()
					.nice();
			else
				chart.axes.scale_y = d3.scalePoint()
					.padding(0.3); 
			chart.origDomainY = chart.get_domainY;	
	  }	
		
		var inherited_updateSize = chart.updateSize;
		chart.updateSize = function() {
			inherited_updateSize();

			if(typeof chart.transition !== "undefined"){
				chart.svg.select(".axes_g").transition(chart.transition)
					.attr("transform", "translate(" + chart.get_margin().left + 
									", " + chart.get_margin().top + ")");
				chart.axes.x_g.transition(chart.transition)
					.attr( "transform", "translate(0," + chart.get_plotHeight() + ")" );
				chart.axes.x_label.transition(chart.transition)
					.attr("x", chart.get_plotWidth());

			}	else {
				chart.svg.select(".axes_g")
					.attr("transform", "translate(" + chart.get_margin().left + 
									", " + chart.get_margin().top + ")");
				chart.axes.x_g
					.attr( "transform", "translate(0," + chart.get_plotHeight() + ")" );
				chart.axes.x_label
					.attr("x", chart.get_plotWidth());
			}
			chart.axes.scale_x.range([0, chart.get_plotWidth()]);
			chart.axes.scale_y.range([chart.get_plotHeight(), 0]);

			chart.updateAxes();

			return chart;
		};

		// This function takes two linear scales, and extends the domain of one of them to get  
		// the desired x:y aspect ratio 'asp'. 
		function fix_aspect_ratio( scaleX, scaleY, asp ) { 
		   var xfactor = ( scaleX.range()[1] - scaleX.range()[0] ) /  
		      ( scaleX.domain()[1] - scaleX.domain()[0] ) 
		   var yfactor = ( scaleY.range()[1] - scaleY.range()[0] ) /  
		      ( scaleY.domain()[1] - scaleY.domain()[0] ) 
		   var curasp = Math.abs( xfactor / yfactor )  // current aspect ratio 
		   if( curasp > asp ) {  // x domain has to be expanded 
		      var cur_dom_length = ( scaleX.domain()[1] - scaleX.domain()[0] ) 
		      var extension = cur_dom_length * ( curasp/asp - 1 ) / 2 
		      scaleX.domain( [ scaleX.domain()[0] - extension, scaleX.domain()[1] + extension ] )       
		   } else { // y domain has to be expanded 
		      var cur_dom_length = ( scaleY.domain()[1] - scaleY.domain()[0] ) 
		      var extension = cur_dom_length * ( asp/curasp - 1 ) / 2 
		      scaleY.domain( [ scaleY.domain()[0] - extension, scaleY.domain()[1] + extension ] )             
		   } 
		} 

		var get_ticks = function(axis){
			var ticks = {tickValues: null, tickFormat: null},
				tickArray = chart["ticks" + axis]();
			
			if(tickArray){
				//check if the ticks are set correctly
				if(typeof tickArray.splice === "undefined")
					throw "Error in 'get_ticks': new tick values and labels should be passed " +
								"as an array";
				if(typeof tickArray[0].splice === "undefined")
					tickArray = [tickArray];
				for(var i = 1; i < tickArray.length; i++)
					if(tickArray[0].length != tickArray[i].length)
						throw "Error in 'get_ticks': the amount of tick labels must be equal to the " +
									"amount of tick values";

				//if only tick values (not tick labels) then return 					
				ticks.tickValues = tickArray[0];
				if(tickArray.length == 1)
					return ticks;

				//if all the labels sets are identical, leave only one of them
				var ident = tickArray.length > 2, j = 1, i;
				while(ident && j < tickArray.length - 1){
					i = 0;
					while(ident && i < tickArray[j].length){
						ident = (tickArray[j][i] == tickArray[j + 1][i]);
						i++;
					}
					j++;
				}
				if(ident)
					tickArray.splice(2);
				
				//if we have several label sets, transform the labels into <tspan> blocks
				var tickLabels = [], value;
				if(tickArray.length > 2){
					for(var i = 0; i < tickArray[0].length; i++){
						value = "";
						for(var j = 1; j < tickArray.length; j++){
							//location
							value += "<tspan x = 0.5 dy = " + 1.1 + "em";
							//colour if any
							if(tickArray.colour) 
								value += " fill = '" + tickArray.colour[j - 1] + "'>"
							else
								value += ">";
							value += tickArray[j][i] + "</tspan>";
						}
						tickLabels.push(value);
					}
				} else {
					tickLabels = tickArray[1];
				}
				ticks.tickFormat = function(d) {return tickLabels[ticks.tickValues.indexOf(d)];};
			}
			
			return ticks;
		}

		chart.updateAxes = function(){
	    chart.axes.x_label
	    	.text( chart.get_labelX());
			chart.axes.y_label
	   		.text( chart.get_labelY() );
	    chart.axes.scale_x.domain(chart.get_domainX());
			chart.axes.scale_y.domain(chart.get_domainY());
			if(chart.aspectRatio())
				fix_aspect_ratio(chart.axes.scale_x, chart.axes.scale_y, chart.get_aspectRatio());

			var ticksX = get_ticks("X"),
				ticksY = get_ticks("Y");

	    if(typeof chart.transition !== "undefined") {
		    d3.axisBottom()
		      .scale( chart.axes.scale_x )
		      .tickValues(ticksX.tickValues)
		      .tickFormat(ticksX.tickFormat)
		      ( chart.axes.x_g.transition(chart.transition) );

		    d3.axisLeft()
		      .scale( chart.axes.scale_y )
		      .tickValues(ticksY.tickValues)
		      .tickFormat(ticksY.tickFormat)
		      ( chart.axes.y_g.transition(chart.transition) );	
	    } else {
		    d3.axisBottom()
		      .tickValues(ticksX.tickValues)
		      .tickFormat(ticksX.tickFormat)
		      .scale( chart.axes.scale_x )
		      ( chart.axes.x_g );

		    d3.axisLeft()
		      .scale( chart.axes.scale_y )
		      .tickValues(ticksY.tickValues)
		      .tickFormat(ticksY.tickFormat) 
		      ( chart.axes.y_g );    	
	    }

	    var updateX = function() {
	    	chart.axes.x_g.selectAll(".tick").selectAll("text")
	    		.html(ticksX.tickFormat)
	    };
	    if(ticksX.tickFormat)
	    	if(chart.transition)
	    		setTimeout(updateX, chart.transition.duration())
	    	else
	    		updateX();

	    var updateY = function() {
	    	chart.axes.y_g.selectAll(".tick").selectAll("text")
	    		.html(ticksX.tickFormat)
	    };
	    if(ticksY.tickFormat)
	    	if(chart.transition)
	    		setTimeout(updateY, chart.transition.duration())
	    	else
	    		updateY();

	    for(var k in chart.layers)
	    	chart.get_layer(k).updatePointLocation();

	    return chart;
		}

		return chart;
	}

	function heatmapChart(id, chart){

		var chart = chartBase()
			.add_property("nrows")
			.add_property("ncols");
		
		chart.add_property("colLabels", function(i) {return i;})
			.add_property("rowLabels", function(i) {return i;})
			.add_property("colIds", function() {return undefined})
			.add_property("rowIds", function() {return undefined})
			.add_property("dispColIds", function() {return chart.get_colIds();})
			.add_property("dispRowIds", function() {return chart.get_rowIds();})
			.add_property("heatmapRow", function(rowId) {return chart.get_dispRowIds().indexOf(rowId);})
			.add_property("heatmapCol", function(colId) {return chart.get_dispColIds().indexOf(colId);})
			.add_property("value")
			.add_property("colour", function(val) {return chart.colourScale(val);})
			.add_property("palette", d3.interpolateOrRd) //? Do we need it? Really
			.add_property("colourRange", function() {return chart.dataRange()})
			.add_property("clusterRowMetric", getEuclideanDistance)
			.add_property("clusterColMetric", getEuclideanDistance)
			.add_property("on_click", function() {})
			.add_property("rowTitle", "")
			.add_property("showValue", false)
			.add_property("colTitle", "")
			.add_property("showLegend", true)
			.add_property("informText", function(rowId, colId) {
				return "Row: <b>" + rowId + "</b>;<br>" + 
							"Col: <b>" + colId + "</b>;<br>" + 
							"value = " + chart.get_value(rowId, colId).toFixed(2)
				});

		chart.margin({top: 100, left: 100, right: 10, bottom: 40});

		chart.ncols("_override_", "colIds", function(){
			return d3.range(chart.get_ncols());
		});
		chart.nrows("_override_", "rowIds", function(){
			return d3.range(chart.get_nrows());
		});
		chart.rowIds("_override_", "nrows", function(){
			return chart.get_rowIds().length;
		});
		chart.colIds("_override_", "ncols", function(){
			return chart.get_colIds().length;
		});
	/*	chart.dispRowIds("_override_", "nrows", function(){
			return chart.get_dispRowIds().length;
		});
		chart.dispColIds("_override_", "ncols", function(){
			return chart.get_dispColIds().length;
		}); */
		chart.axes = {};

		var inherited_put_static_content = chart.put_static_content;
		chart.put_static_content = function(element){
			inherited_put_static_content(element);
			add_click_listener(chart);
			//create main parts of the heatmap
			chart.svg.append("g")
				.attr("class", "row label_panel");
			chart.svg.append("g")
				.attr("class", "col label_panel");
					//delete canvas if any
			chart.g = chart.svg.append("g")
				.attr("class", "chart_g")
				.attr("clip-path", "url(#viewBox)");
			chart.text = chart.g.append("g")
				.attr("class", "text_g");
			chart.axes.x_label = chart.svg.append("text")
				.attr("class", "axisLabel")
				.attr("text-anchor", "end");
			chart.axes.y_label = chart.svg.append("text")
				.attr("class", "axisLabel")
				.attr("text-anchor", "end")
				.attr("transform", "rotate(-90)");
			chart.svg.append("g")
				.attr("class", "legend_panel");
		}

		chart.findPoints = function(lu, rb){
			var selectedPoints = chart.g.selectAll(".data_point")
				.filter(function() {
					var loc = [this.x.baseVal.value, this.y.baseVal.value];
					return (loc[0] <= rb[0]) && (loc[1] <= rb[1]) && 
						(loc[0] + chart.cellSize.width >= lu[0]) && 
						(loc[1] + chart.cellSize.height >= lu[1]);
				});
			if(!selectedPoints.empty())
				return selectedPoints;
			if(lu[0] * lu[1] < 0 && rb[0] * rb[1] < 0 )
				if(lu[0] < 0)
					selectedPoints = chart.svg.select(".row").selectAll(".label")
						.filter(function(){
							var loc = d3.select(this).attr("dy") * 1;
							return lu[1] >= loc - chart.cellSize.height && rb[1] <= loc;
						})
				else
					selectedPoints = chart.svg.select(".col").selectAll(".label")
						.filter(function(){
							var loc = d3.select(this).attr("dy") * 1;
							return lu[0] >= loc - chart.cellSize.width && rb[0] <= loc;
						});
			return selectedPoints;
		}	
		//returns maximum and minimum values of the data
		chart.dataRange = function(){
			var i = 0, range, newRange,
				rowIds = chart.get_rowIds(),
				colIds = chart.get_colIds();
			do{
				newRange = d3.extent(colIds, 
					function(col) {return chart.get_value(rowIds[i], col);});
				if(typeof range === "undefined")
					range = newRange;
				if(newRange[0] < range[0])
					range[0] = newRange[0];
				if(newRange[1] > range[1])
					range[1] = newRange[1];
				i++;
			}while (i < chart.get_nrows())
				
			return range;
		}

		//set default hovering behaviour
		chart.labelMouseOver = function() {
			d3.select(this).classed("hover", true);
		};
		chart.labelMouseOut = function() {
			d3.select(this).classed("hover", false);
		};

		chart.reorderRow = function(f){
			if(f == "flip"){
				chart.get_heatmapRow("__flip__");
				chart.updateLabelPosition();
				return chart;
			}
			chart.svg.select(".col").selectAll(".label")
				.classed("selected", false)
				.classed("sorted", false);

			var ids = chart.get_rowIds().slice(), ind;
			ids = ids.sort(f);
			chart.heatmapRow(function(rowId){
				if(rowId == "__flip__"){
					ids = ids.reverse();
					return;
				}
				if(rowId == "__order__")
					return ids.sort(f);
				var actIds = chart.get_dispRowIds(),
					orderedIds = ids.filter(function(e) {
						return actIds.indexOf(e) != -1;
					});
				if(orderedIds.length != actIds.length) {
					orderedIds = actIds.sort(f);
					ids = orderedIds.slice();
				} 
				
				ind = orderedIds.indexOf(rowId);
				if(ind > -1)
					 return ind
				else
					throw "Wrong rowId in chart.get_heatmapRow";
			});
			
			chart.updateLabelPosition();
			return chart;
		}
		chart.reorderCol = function(f){
			if(f == "flip"){
				chart.get_heatmapCol("__flip__");
				chart.updateLabelPosition();
				return chart;
			}
			chart.svg.select(".row").selectAll(".label")
				.classed("selected", false)
				.classed("sorted", false);
			var ids = chart.get_colIds().slice(), ind;
			ids = ids.sort(f);
			chart.heatmapCol(function(colId){
				if(colId == "__flip__"){
					ids = ids.reverse();
					return;
				}
				if(colId == "__order__")
					return ids.sort(f);

				var actIds = chart.get_dispColIds(),
					orderedIds = ids.filter(function(e) {
						return actIds.indexOf(e) != -1;
					});
				if(orderedIds.length != actIds.length) {
					orderedIds = actIds.sort(f);
					ids = orderedIds.slice();
				}
				
				ind = orderedIds.indexOf(colId);
				if(ind > -1)
					 return ind
				else
					throw "Wrong rowId in chart.get_heatmapRow";
			});
			chart.updateLabelPosition();
			return chart;
		}
		
		var inherited_updateSize = chart.updateSize;
		chart.updateSize = function(){
			inherited_updateSize();
			if(typeof chart.transition !== "undefined"){
				chart.svg.selectAll(".label_panel").transition(chart.transition)
					.attr("transform", "translate(" + chart.get_margin().left + ", " +
						chart.get_margin().top + ")");
				chart.svg.select(".legend_panel").transition(chart.transition)
					.attr("transform", "translate(0, " + 
						(chart.get_margin().top + chart.get_plotHeight()) + ")");
				chart.g.transition(chart.transition)
					.attr("transform", "translate(" + chart.get_margin().left + ", " +
						chart.get_margin().top + ")");
				chart.axes.x_label.transition(chart.transition)
					.attr("font-size", d3.min([chart.get_margin().bottom - 2, 15]))
					.attr("x", chart.get_plotWidth() + chart.get_margin().left)
					.attr("y", chart.get_height());
				chart.axes.y_label.transition(chart.transition)
					.attr("font-size", d3.min([chart.get_margin().right - 2, 15]))
					.attr("x", - chart.get_margin().top)
					.attr("y", chart.get_width());
			} else {
				chart.svg.selectAll(".label_panel")
					.attr("transform", "translate(" + chart.get_margin().left + ", " +
						chart.get_margin().top + ")");
				chart.svg.select(".legend_panel")
					.attr("transform", "translate(0, " + 
						(chart.get_margin().top + chart.get_plotHeight()) + ")");
				chart.g
					.attr("transform", "translate(" + chart.get_margin().left + ", " +
						chart.get_margin().top + ")");								
				chart.axes.x_label
					.attr("font-size", d3.min([chart.get_margin().bottom - 2, 15]))
					.attr("x", chart.get_plotWidth() + chart.get_margin().left)
					.attr("y", chart.get_height());
				chart.axes.y_label
					.attr("font-size", d3.min([chart.get_margin().right - 2, 15]))
					.attr("x", - chart.get_margin().top)
					.attr("y", chart.get_width());

			}

			chart.updateLegendSize();
			chart.updateLabelPosition();
			return chart;
		}

		chart.updateLabelPosition = function(){
			var ncols = chart.get_dispColIds().length,
				nrows = chart.get_dispRowIds().length;

			//calculate cell size
			chart.cellSize = {
				width: chart.get_plotWidth() / ncols,
				height: chart.get_plotHeight() / nrows
			}
			//create scales
			chart.axes.scale_x = d3.scaleLinear()
				.domain( [0, ncols - 1] )
				.range( [0, chart.get_plotWidth() - chart.cellSize.width] )
				.nice();
			chart.axes.scale_y = d3.scaleLinear()
				.domain( [0, nrows - 1] )
				.range( [0, chart.get_plotHeight() - chart.cellSize.height] )
				.nice();

			if(typeof chart.transition !== "undefined"){
				chart.svg.select(".col").selectAll(".label").transition(chart.transition)
					.attr("font-size", d3.min([chart.cellSize.width, 12]))
					.attr("dy", function(d) {return chart.axes.scale_x(chart.get_heatmapCol(d) + 1);});
				chart.svg.select(".row").selectAll(".label").transition(chart.transition)
					.attr("font-size", d3.min([chart.cellSize.height, 12]))
					.attr("dy", function(d) {return chart.axes.scale_y(chart.get_heatmapRow(d) + 1);});
			
			} else {
				chart.svg.select(".col").selectAll(".label")
					.attr("font-size", d3.min([chart.cellSize.width, 12]))
					.attr("dy", function(d) {return chart.axes.scale_x(chart.get_heatmapCol(d) + 1);});
				chart.svg.select(".row").selectAll(".label")
					.attr("font-size", d3.min([chart.cellSize.height, 12]))
					.attr("dy", function(d) {return chart.axes.scale_y(chart.get_heatmapRow(d) + 1);});
			}
			chart.updateCellPosition();
			return chart;
		}

		chart.updateLabels = function(){
			//add column labels
			var colLabels = chart.svg.select(".col").selectAll(".label")
					.data(chart.get_dispColIds(), function(d) {return d;});
			colLabels.exit()
				.remove();
			//add row labels
			var rowLabels = chart.svg.select(".row").selectAll(".label")
					.data(chart.get_dispRowIds(), function(d) {return d;});
			rowLabels.exit()
				.remove();
			colLabels.enter()
				.append("text")
					.attr("class", "label")
					.attr("transform", "rotate(-90)")
					.style("text-anchor", "start")
					.attr("dx", 2)
					.merge(colLabels)
						.on("mouseover", chart.labelMouseOver)
						.on("mouseout", chart.labelMouseOut)
						.on("click", chart.labelClick);
			rowLabels.enter()
				.append("text")
					.attr("class", "label")
					.style("text-anchor", "end")
					.attr("dx", -2)
					.merge(rowLabels)
						.on("mouseover", chart.labelMouseOver)
						.on("mouseout", chart.labelMouseOut)
						.on("click", chart.labelClick);

			chart.updateCells();
			return chart;
		}

		chart.updateLabelText = function(){
			if(typeof chart.transition !== "undefined"){
				chart.svg.select(".col").selectAll(".label").transition(chart.transition)
					.text(function(d) {return chart.get_colLabels(d);});
				chart.svg.select(".row").selectAll(".label").transition(chart.transition)
					.text(function(d) {return chart.get_rowLabels(d)});		
			} else {
				chart.svg.select(".col").selectAll(".label")
					.text(function(d) {return chart.get_colLabels(d);});
				chart.svg.select(".row").selectAll(".label")
					.text(function(d) {return chart.get_rowLabels(d)});
			}
			return chart;		
		}

		chart.zoom = function(lu, rb){
			var selectedCells = chart.findPoints(lu, rb);
			if(selectedCells.size() < 2)
				return;
			var rowIdsAll = selectedCells.data().map(function(d){
					return d[0];
				}),
				colIdsAll = selectedCells.data().map(function(d){
					return d[1];
				}),
				rowIds = [], colIds = [];

			for(var i = 0; i < rowIdsAll.length; i++)
				if(rowIds.indexOf(rowIdsAll[i]) == -1)
					rowIds.push(rowIdsAll[i]);
			for(var i = 0; i < colIdsAll.length; i++)
				if(colIds.indexOf(colIdsAll[i]) == -1)
					colIds.push(colIdsAll[i]);
			if(rowIds.length > 0 )
			chart.dispRowIds(rowIds);
			chart.dispColIds(colIds);
			chart.updateLabels();
			chart.updateLabelPosition();

			return chart;
		}

		chart.resetDomain = function(){
			chart.dispColIds(chart.get_colIds);
			chart.dispRowIds(chart.get_rowIds);
			chart.mark("__clear__");
			chart.updateLabels()
				.updateLabelPosition()
				.updateCellColour()
				.updateLabelText();
			return chart;
		}

		chart.resetColourScale = function(){
		//create colorScale
			var range = chart.get_colourRange();
			chart.colourScale = d3.scaleSequential(chart.get_palette).domain(range);
			if(chart.get_showLegend())
				chart.updateLegend();		
		}	

		//some default onmouseover and onmouseout behaviour for cells and labels
		//may be later moved out of the main library
		chart.pointMouseOver = function(d) {
			//change colour and class
			d3.select(this)
				.attr("fill", function(d) {
					return d3.rgb(chart.get_colour(chart.get_value(d[0], d[1]))).darker(0.5);
				})
				.classed("hover", true);		
			//find column and row labels
			chart.svg.select(".col").selectAll(".label")
				.filter(function(dl) {return dl == d[1];})
					.classed("hover", true);
			chart.svg.select(".row").selectAll(".label")
				.filter(function(dl) {return dl == d[0];})
					.classed("hover", true);
			//show label
			if(chart.get_showValue()){
				chart.g.selectAll(".tval").filter(function(fd){
					return fd[0] == d[0] && fd[1] == d[1];
				})
				.classed("hidden", false);
			} else {
			chart.container.select(".inform")
				.style("left", (d3.event.pageX + 10) + "px")
				.style("top", (d3.event.pageY - 10) + "px")
				.select(".value")
					.html(function() {return chart.get_informText(d[0], d[1])});  
			chart.container.select(".inform")
				.classed("hidden", false);
			}
		};
		chart.pointMouseOut = function(d) {
			//change colour and class
			d3.select(this)
				.attr("fill", function(d) {
					return chart.get_colour(chart.get_value(d[0], d[1]));
				})
				.classed("hover", false);
			//deselect row and column labels
			chart.svg.selectAll(".label")
				.classed("hover", false);
			if(chart.get_showValue()){
				chart.g.selectAll(".tval").classed("hidden", true);
			} else {
				chart.container.select(".inform")
					.classed("hidden", true);
			}
		};
		
		//set default clicking behaviour for labels (ordering)
		chart.labelClick = function(d){
			//check whether row or col label has been clicked
			var type;
			d3.select(this.parentNode).classed("row") ? type = "row" : type = "col";
			//if this label is already selected, flip the heatmap
			if(d3.select(this).classed("sorted")){
				type == "col" ? chart.reorderRow("flip") : chart.reorderCol("flip");
			} else {
				//select new label and chage ordering
				if(type == "col")
					chart.reorderRow(function(a, b){
						return chart.get_value(b, d) - chart.get_value(a, d);
					})
				else
					chart.reorderCol(function(a, b){
						return chart.get_value(d, b) - chart.get_value(d, a);
					});
			}
			d3.select(this).classed("sorted", true);
			chart.svg.selectAll(".sorted").classed("selected", true);
		};
		
		chart.updateCellColour = function() {
			if(typeof chart.transition !== "undefined")
				chart.g.selectAll(".data_point").transition(chart.transition)
					.attr("fill", function(d) {
						return chart.get_colour(chart.get_value(d[0], d[1]));
				})
			else
				chart.g.selectAll(".data_point")
					.attr("fill", function(d) {
						return chart.get_colour(chart.get_value(d[0], d[1]));
				});
			chart.svg.selectAll(".sorted")
				.classed("selected", false)
				.classed("sorted", false);

			if(chart.get_showValue())
				chart.updateTextValues();
			return chart;
		}

		chart.updateCells = function(){
			//add rows
			var rows = chart.g.selectAll(".data_row")
				.data(chart.get_dispRowIds(), function(d) {return d;});
			rows.exit()
				.remove();
			rows.enter()
				.append("g")
					.attr("class", "data_row");

			//add cells	
			var cells = chart.g.selectAll(".data_row").selectAll(".data_point")
				.data(function(d) {
					return chart.get_dispColIds().map(function(e){
						return [d, e];
					})
				}, function(d) {return d;});
			cells.exit()
				.remove();
			cells.enter()
				.append("rect")
					.attr("class", "data_point")
					.merge(cells)
						.on("mouseover", chart.pointMouseOver)
						.on("mouseout", chart.pointMouseOut)
						.on("click", function(d) {
							chart.get_on_click.apply(this, [d[0], d[1]]);
						});
			
			if(chart.get_showValue())
				chart.updateTexts();
			
			return chart;
		}

		chart.updateCellPosition = function(){
			if(typeof chart.transition !== "undefined")
				chart.g.selectAll(".data_point").transition(chart.transition)
					.attr("x", function(d){
						return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
					})
					.attr("width", chart.cellSize.width)
					.attr("height", chart.cellSize.height)								
					.attr("y", function(d) {
						return chart.axes.scale_y(chart.get_heatmapRow(d[0]))
					})
			else
				chart.g.selectAll(".data_point")
					.attr("x", function(d){
						return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
					})
					.attr("width", chart.cellSize.width)
					.attr("height", chart.cellSize.height)								
					.attr("y", function(d) {
						return chart.axes.scale_y(chart.get_heatmapRow(d[0]))
					});

			if(chart.get_showValue())
				chart.updateTextPosition();

			return chart;
		}

		//type shoud be Row or Col
		chart.cluster = function(type){
			if(type != "Row" && type != "Col")
				throw "Error in 'cluster': type " + type + " cannot be recognised. " +
						"Please, use either 'Row' or 'Col'";
			var items = {}, it = [],
				aIds = chart["get_disp" + type + "Ids"](),
				bIds;
			type == "Row" ? bIds = chart.get_dispColIds() :
				bIds = chart.get_dispRowIds();

			for(var i = 0; i < aIds.length; i++) {
				for(var j = 0; j < bIds.length; j++)
					type == "Row" ? it.push(chart.get_value(aIds[i], bIds[j])) :
													it.push(chart.get_value(bIds[j], aIds[i]));
				items[aIds[i]] = it.slice();
				it = [];
			}

			var getDistance = function(a, b) {
				return chart["get_cluster" + type + "Metric"](items[a], items[b]);
			};

			var newOrder = [];
			var traverse = function(node) {
				if(node.value){
					newOrder.push(node.value);
					return;
				}
				traverse(node.left);
				traverse(node.right);
			}

			var clusters = clusterfck.hcluster(aIds, getDistance, clusterfck.COMPLETE_LINKAGE);
			traverse(clusters);
			
			var oldOrder = chart["get_heatmap" + type]("__order__");
			chart["reorder" + type](function(a, b){
				if(newOrder.indexOf(a) != -1 && newOrder.indexOf(b) != -1)
					return newOrder.indexOf(a) - newOrder.indexOf(b);
				return oldOrder.indexOf(a) - oldOrder.indexOf(b);
			});
			
			chart.updateLabelPosition();

			return chart;		
		}

		chart.updateTexts = function(){
			//add rows
			var rows = chart.g.selectAll(".text_row")
				.data(chart.get_dispRowIds(), function(d) {return d;});
			rows.exit()
				.remove();
			rows.enter()
				.append("g")
					.attr("class", "text_row");

			//add text	
			var text = chart.g.selectAll(".text_row").selectAll(".tval")
				.data(function(d) {
					return chart.get_dispColIds().map(function(e){
						return [d, e];
					})
				}, function(d) {return d;});
			text.exit()
				.remove();
			text.enter()
				.append("text")
					.attr("class", "tval hidden");
			return chart;		
		}
		chart.updateTextPosition = function(){
			if(typeof chart.transition !== "undefined")
				chart.g.selectAll(".tval").transition(chart.transition)
					.attr("x", function(d){
						return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
					})
					.attr("font-size", chart.cellSize.height * 0.5)								
					.attr("y", function(d) {
						return chart.axes.scale_y(chart.get_heatmapRow(d[0]) ) + chart.cellSize.height * 0.75
					})
			else
				chart.g.selectAll(".tval")
					.attr("x", function(d){
						return chart.axes.scale_x(chart.get_heatmapCol(d[1]));
					})
					.attr("font-size", chart.cellSize.height * 0.5)								
					.attr("y", function(d) {
						return chart.axes.scale_y(chart.get_heatmapRow(d[0])) + chart.cellSize.height * 0.75;
					})
			return chart;
		}
		chart.updateTextValues = function(){
			if(typeof chart.transition !== "undefined")
				chart.g.selectAll(".tval").transition(chart.transition)
					.text(function(d) {
						return chart.get_value(d[0], d[1]).toFixed(1);
				})
			else
				chart.g.selectAll(".tval")
					.text(function(d) {
						return chart.get_value(d[0], d[1]).toFixed(1);
				});
			return chart;
		}

		chart.updateLegendSize = function(){
			//calculate the size of element of legend
			var height = d3.min([chart.get_margin().bottom * 0.5, 20]),
				width = d3.min([chart.get_width()/23, 30]),
				fontSize = d3.min([chart.get_margin().bottom * 0.3, width / 2, 15]),
				blocks = chart.svg.select(".legend_panel").selectAll(".legend_block")
				.attr("transform", function(d) {
					return "translate(" + (d + 1) * width + ", 0)";
				});
			blocks.selectAll("text")
				.attr("font-size", fontSize)
				.attr("dy", chart.get_margin().bottom * 0.4)
				.attr("dx", width);
			blocks.selectAll("rect")
				.attr("height", height)
				.attr("width", width)
				.attr("y", chart.get_margin().bottom * 0.5);
		}

		chart.updateLegend = function(){
			var range = chart.get_colourRange(),
				step = (range[1] - range[0]) / 20,
				blocks = chart.svg.select(".legend_panel")
				.selectAll(".legend_block").data(d3.range(21))
					.enter().append("g")
						.attr("class", "legend_block");
			blocks.append("text")
				.attr("text-anchor", "end");
			blocks.append("rect");
			chart.svg.select(".legend_panel")
				.selectAll(".legend_block").selectAll("text")
					.text(function(d) {
						if(d % 2 == 0)
							return (range[0] + step * d).toFixed(2)
						else
							return "";
					});
			chart.svg.select(".legend_panel")
				.selectAll(".legend_block").selectAll("rect")
					.attr("fill", function(d) {return chart.colourScale(range[0] + step * d)});
		}
		
		chart.update = function() {
			chart.updateTitle();
			chart.resetColourScale();
			chart.axes.x_label
				.text(chart.get_colTitle());
			chart.axes.y_label
				.text(chart.get_rowTitle());
			chart.updateLabels()
				.updateSize()
				.updateLabelText()
				.updateCellColour();

			return chart;
		}

		return chart;	
	}

	/*	layer.updateCanvas = function() {
		
			if(typeof layer.g != "undefined")
				layer.g.classed("hidden", true);
			if(typeof layer.canvas == "undefined")
				layer.canvas = layer.chart.container.append("canvas")
			else
				layer.canvas.classed("hidden", false);

			//if there is any canvas, remove it as well
			layer.canvas.remove();
			
			//create a canvas object
			var heatmapBody = layer.chart.container.append("canvas")
				.style("position", "absolute")
				.style("left", layer.get_margin().left + "px")
				.style("top", layer.get_margin().top + "px")
				.property("width", layer.get_width())
				.property("height", layer.get_height())
				.node().getContext("2d");
			var pixelHeatmap = document.createElement("canvas");
			pixelHeatmap.width = layer.get_ncols();
			pixelHeatmap.height = layer.get_nrows();
			
			//store colour of each cell
			var rgbColour, position;
			//create an object to store information on each cell of a heatmap
			var pixelData = new ImageData(layer.get_ncols(), layer.get_nrows());

			for(var i = 0; i < layer.get_dispRowIds().length; i++)
				for(var j = 0; j < layer.get_dispColIds().length; j++) {
						rgbColour = d3.rgb(layer.get_colour(layer.get_value(layer.get_dispRowIds()[i], 
																														layer.get_dispColIds()[j])));
						position = layer.get_heatmapRow(layer.get_dispRowIds()[i]) * layer.get_ncols() * 4 +
							layer.get_heatmapCol(layer.get_dispColIds()[j]) * 4;
						pixelData.data[position] = rgbColour.r;
						pixelData.data[position + 1] = rgbColour.g;
						pixelData.data[position + 2] = rgbColour.b;
				}
			//set opacity of all the pixels to 1
			for(var i = 0; i < layer.get_ncols() * layer.get_nrows(); i++)
				pixelData.data[i * 4 + 3] = 255;
			
			//put a small heatmap on screen and then rescale it
			pixelHeatmap.getContext("2d").putImageData(pixelData, 0 , 0);

			heatmapBody.imageSmoothingEnabled = false;
			//probaly no longer required, but let it stay here just in case
	    //heatmapBody.mozImageSmoothingEnabled = false;
			//heatmapBody.webkitImageSmoothingEnabled = false;
	    //heatmapBody.msImageSmoothingEnabled = false;

			heatmapBody.drawImage(pixelHeatmap, 0, 0, 
				layer.get_dispColIds().length, layer.get_dispRowIds().length,
				0, 0,	layer.get_width(), layer.get_height());
		}*/

	function sigmoid( x, midpoint, slope ) {
	  return 1 / ( 1 + Math.exp( -slope * ( x - midpoint ) ) )
	}

	function make_stretched_sigmoid( midpoint, slope, xl, xr ) {
	  var yl = sigmoid( xl, midpoint, slope, 0, 1 )
	  var yr = sigmoid( xr, midpoint, slope, 0, 1 )
	  var ym = Math.min( yl, yr )
	  return function(x) { return ( sigmoid( x, midpoint, slope, 1 ) - ym ) / Math.abs( yr - yl ) }
	}

	function sigmoidColorSlider() {

	  // for now only horizontal

	  var obj = chartBase()
	    .add_property( "straightColorScale" )
	    .add_property( "midpoint", undefined )
	    .add_property( "slopewidth", undefined )
	    .add_property( "on_drag", function() {})
			.add_property( "on_change", function() {})
	    .margin( { top: 20, right: 10, bottom: 5, left: 10 } )
	    .height( 80 )
	    .transitionDuration( 0 );    

	  obj.straightColorScale(
	    d3.scaleLinear()
	      .range( [ "white", "darkblue" ] ) );

	  obj.clamp_markers = function() {
	    var min = d3.min( obj.get_straightColorScale.domain() );
	    var max = d3.max( obj.get_straightColorScale.domain() );
	    if( obj.get_midpoint() < min )
	       obj.midpoint( min );
	    if( obj.get_midpoint() > max )
	       obj.midpoint( max );
	    if( obj.get_slopewidth() > (max-min) )
	       obj.slopewidth( max-min );
	    if( obj.get_slopewidth() < (min-max) )
	       obj.slopewidth( min-max );
	  }
		
	  var inherited_put_static_content = obj.put_static_content;
	  obj.put_static_content = function( element ) {
	    inherited_put_static_content( element );

	    var g = obj.svg.append( "g" )
	      .attr( "class", "sigmoidColorSlider" )
	      .attr( "transform", "translate(" + obj.get_margin().left + ", " + 
																		obj.get_margin().top + ")" );  // space for axis

	    obj.axis = g.append( "g" )
	      .attr( "class", "axis" );

	    var defs = g.append( "defs" );

	    obj.gradient = defs.append( "linearGradient" )
	      .attr( "id", "scaleGradient")
	      .attr( "x1", "0%")
	      .attr( "y1", "0%")
	      .attr( "x2", "100%")
	      .attr( "y2", "0%");

	    obj.gradient.selectAll( "stop" )
	      .data( d3.range(100) )
	      .enter().append( "stop" )
	        .attr( "offset", function(d) { return d + "%" } )

	    obj.colorBar = g.append( "rect" )
	      .attr( "x", "0" )
	      .attr( "y", "5" )
	      .attr( "height", 20 )
	      .attr( "fill", "url(#scaleGradient)" )
	      .style( "stroke", "black" )
	      .style( "stroke-width", "1");

	    defs.append( "path" )
	         .attr( "id", "mainMarker" )
	         .attr( "d", "M 0 0 L 8 5 L 8 25 L -8 25 L -8 5 Z")
	         .style( "fill", "gray" )
	         .style( "stroke", "black" )

	    defs.append( "path" )
	         .attr( "id", "rightMarker" )
	         .attr( "d", "M 0 0 L 5 5 L 5 15 L 0 15 Z")
	         .style( "fill", "lightgray" )
	         .style( "stroke", "black" )

	    defs.append( "path" )
	         .attr( "id", "leftMarker" )
	         .attr( "d", "M 0 0 L -5 5 L -5 15 L 0 15 Z")
	         .style( "fill", "lightgray" )
	         .style( "stroke", "black" )

	    obj.mainMarker = g.append( "use" )
	      .attr( "xlink:href", "#mainMarker")
	      .attr( "y", 28 )
	      .call( d3.drag()
	        .on( "drag", function() {
	          obj.midpoint( obj.pos_scale.invert( obj.pos_scale( obj.get_midpoint() ) + d3.event.dx ) );
	          obj.clamp_markers();
	          obj.get_on_drag();
	          obj.update();
	        } )
	        .on("end", function() {
						obj.get_on_change();
					})
				);

	    obj.rightMarker = g.append( "use" )
	      .attr( "xlink:href", "#rightMarker")
	      .attr( "y", 30 )
	      .call( d3.drag()
	        .on( "drag", function() {
	          obj.slopewidth( obj.pos_scale.invert( obj.pos_scale( obj.get_slopewidth() ) + d3.event.dx ) );
	          obj.clamp_markers();
	          obj.update();        
	          obj.get_on_drag();
	        } )
					.on("end", function() {
						obj.get_on_change();
					})
				);

	    obj.leftMarker = g.append( "use" )
	      .attr( "xlink:href", "#leftMarker")
	      .attr( "y", 30 )
	      .call( d3.drag()
	        .on( "drag", function() {
	          obj.slopewidth( obj.pos_scale.invert( obj.pos_scale( obj.get_slopewidth() ) - d3.event.dx ) );
	          obj.clamp_markers();
	          obj.update();        
	          obj.get_on_drag();
	        } )
				  .on("end", function() {
					  obj.get_on_change();
				  })
			  );

	  }
		
	  var inherited_update = obj.update;
	  obj.update = function() {
	    inherited_update();
			
	    var percent_scale = d3.scaleLinear()
	      .domain( [0, 100] )
	      .range( obj.get_straightColorScale.domain() );

	    if( obj.get_midpoint() == undefined )
	      obj.midpoint( percent_scale( 50 ) );

	    if( obj.get_slopewidth() == undefined )
	      obj.slopewidth( Math.abs(percent_scale( 15 )) );

	    obj.pos_scale = d3.scaleLinear()
	      .range( [ 0, obj.get_plotWidth() ] )
	      .domain( obj.get_straightColorScale.domain() )

	    d3.axisTop()
	      .scale( obj.pos_scale )
	      ( obj.axis );

	    obj.colorBar
	      .attr( "width", obj.get_plotWidth() );

	    //obj.the_sigmoid = function(x) { return sigmoid( x, obj.get_midpoint(), 1.38 / obj.get_slopewidth(), 0, 1 ) };
	    obj.the_sigmoid = make_stretched_sigmoid( obj.get_midpoint(), 1.38 / obj.get_slopewidth(), 
	      obj.get_straightColorScale.domain()[0], obj.get_straightColorScale.domain()[1] );

	    obj.gradient.selectAll( "stop" )
	      .data( d3.range(100) )
	      .style( "stop-color", function(d) { 
	        return obj.get_straightColorScale( 
	          percent_scale( 100 * obj.the_sigmoid( percent_scale(d) ) ) ) } ) ;

	    obj.colourScale = function(val){
	      return obj.get_straightColorScale( 
	          percent_scale( 100 * obj.the_sigmoid( val ) ) );
	    }


	    obj.mainMarker
	      .attr( "x", obj.pos_scale( obj.get_midpoint() ) );
	    obj.rightMarker
	      .attr( "x", obj.pos_scale( obj.get_midpoint() + obj.get_slopewidth() ) )
	    obj.leftMarker
	      .attr( "x", obj.pos_scale( obj.get_midpoint() - obj.get_slopewidth() ) )

			//obj.get_on_change();

	  }

	  return obj;

	}

	function simpleTable() {

	  var chart = chartBase()
	    .add_property( "record", {} )

	  var inherited_put_static_content = chart.put_static_content;
	  chart.put_static_content = function( element ) {
	    inherited_put_static_content(element);
	    chart.table = chart.container.append( "table" )
	      .attr( "border", 1 );
	  }

	  var inherited_update = chart.update;
	  chart.update = function( ) {

	    inherited_update();
	    var sel = chart.table.selectAll( "tr" )
	      .data( Object.keys( obj.get_record() ) );
	    sel.exit()
	      .remove();  
	    sel.enter().append( "tr" )
	    .merge( sel )
	      .html( function(k) { return "<td>" + k + "</td><td>" 
	         + chart.get_record()[k] + "</td>" } )

	    return chart;
	  };

	  return chart;
	}

	exports.base = base;
	exports.layerBase = layerBase;
	exports.chartBase = chartBase;
	exports.axisChart = axisChart;
	exports.scatterChart = scatterChart;
	exports.lineChart = lineChart;
	exports.heatmapChart = heatmapChart;
	exports.cache = cache;
	exports.separateBy = separateBy;
	exports.getEuclideanDistance = getEuclideanDistance;
	exports.add_click_listener = add_click_listener;
	exports.pearsonCorr = pearsonCorr;
	exports.fillTextBlock = fillTextBlock;
	exports.get_symbolSize = get_symbolSize;
	exports.sigmoidColorSlider = sigmoidColorSlider;
	exports.simpleTable = simpleTable;

	Object.defineProperty(exports, '__esModule', { value: true });

}));