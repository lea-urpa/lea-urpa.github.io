// Set visualization parameters
var size = 400
var circles = 12
var buttonswidth = 140
var title = "__notitle__"
var legendboxsize = 20
var opacityval = 0.1

// Set mathematical parameters
var subsampling = false
var tol = 0.001

// Define some functions
var cos = Math.cos;
var sin = Math.sin;

if( Math.sign === undefined ) { 
  Math.sign = function(x) { 
    if( x > 0 ) { 
      return 1; 
    } else if ( x < 0 ) { 
      return -1; 
    } else if( x == 0 ) { 
      return 0; 
    } else 
       throw "Error"; 
  } 
} 

// Define Focused MDS function, which returns the object you want
function focused_mds(distances, ids, focus_point, tol, subsampling) {
	function sqr(x) { return x*x};  // Saves a lot of runtime vs Math.pow
	var abs = Math.abs;
	
	// Create distances object from distance matrix, indexed by ids
	var dist_obj = {}
	for( i = 0; i < distances.length; i++ ) {
		dist_obj[ids[i]] = {}
	   for( j = 0; j < distances[i].length; j++ ) {
	      dist_obj[ids[i]][ids[j]] = distances[i][j]
	   }
	}
	
	// call distances for focus_point
	var focus_dists = distances[ids.indexOf(focus_point)];
	// zip together in an array of arrays the names and distances
	var ids_dists = ids.map(function(e,i){
		return [e, focus_dists[i]];
	});

	// sort the array by the distances
	ids_dists.sort(function(a,b){
		return a[1] - b[1];
	});

	// return index of names in order of distance from focus point 
	var ids_ordered = [];
	for (i in ids_dists){ ids_ordered.push(ids_dists[i][0]); };

	// create an indexable object from these sorted ids and distances
	var result = {};
	for(var i=0; i< ids.length; i++) {
		result[ids_dists[i][0]] = {
			r: ids_dists[i][1],
			phi: [],
			x: [],
			y: []
		}
	};
   
	// Define the stress function
	// This function, to be optimized on, needs only one input (phi)
	// It finds new_point from the for loop environment defined below

	function stress(phi) {
		var stress = 0;
		//position of the new point, given the candidate phi
		var xnew = result[ids_ordered[new_point]].r * cos(phi);
		var ynew = result[ids_ordered[new_point]].r * sin(phi);

		for(j=0; j < new_point; j++ ) {
			//position of the point we are comparing to new point
			var xj = result[ids_ordered[j]].x;
			var yj = result[ids_ordered[j]].y;
	
			// actual distance given in dist_obj
			var dij = dist_obj[ids_ordered[new_point]][sample_ids[j]]
		
			// calculated distance, given where we placed the point
			var Dij = Math.sqrt( sqr((xnew - xj)) + sqr((ynew - yj)) );
	
			var stress = stress + sqr( (dij - Dij));
		};
		return stress;
	};
	
	// setting phi, xy coords, and colors for first two points
	result[ids_ordered[0]].phi = 0;
	result[ids_ordered[0]].x = 0;
	result[ids_ordered[0]].y = 0;

	result[ids_ordered[1]].phi = 3*Math.PI/2;
	result[ids_ordered[1]].x = result[ids_ordered[1]].r * cos(result[ids_ordered[1]].phi);
	result[ids_ordered[1]].y = result[ids_ordered[1]].r * sin(result[ids_ordered[1]].phi);
	
	// use univariate optimization to calculate the rest
	for(var new_point = 2; new_point < ids_ordered.length; new_point++) {
			
		if( ids.length > 100 & subsampling == true & new_point > 100){ 
		// For each point after the 100th point, subsample 
		// a fixed n of points to optimize to for each new plotted point
		var npoints = 100
	
		// Randomly choose n points from the ids_ordered list of names from which to subsample to
		var sample_ids = _.sample(ids, npoints)
		} else { 
		var	sample_ids = ids_ordered;
		}

	result[ids_ordered[new_point]].phi = optimize_js(0, Math.PI*2, function(phi){return stress(phi, sample_ids)}, tol);
	result[ids_ordered[new_point]].x = result[ids_ordered[new_point]].r * cos(result[ids_ordered[new_point]].phi);
	result[ids_ordered[new_point]].y = result[ids_ordered[new_point]].r * sin(result[ids_ordered[new_point]].phi);
	
	};
	return result;
};

function create_focusedMDS_plot(data, dom_id, result){
    // Initializing variables and defining functions
	var old_result = {};
	var scale = {};
	var element_ids = {};
	var sliderPosition = null;
	var focus_point = data.focus_point;
	
	// Make initial graph with all labels and colors

	var color_object = {};
	for(var i=0; i < data.colors.length; i++) {
		 color_object[data.ids[i]] = data.colors[i]
	};
	
	var color_categories = {};
	for (var i=0; i < data.legend_data.categoryvector.length; i++) {
		color_categories[data.ids[i]] = data.legend_data.categoryvector[i]
	}
	// Find max distance in dist for scaling factor functions
	var maxDistance = [];

	for(var i=0; i< data.distances.length; i++) {
		 for(j=0; j< data.distances.length; j++){
		 if( maxDistance < data.distances[i][j]){
		 	maxDistance = data.distances[i][j]
		 }
	 }
	}; 
	
	// Create scaling factors
	scale = d3.scaleLinear()
	         .domain([-1*maxDistance, maxDistance])
	         .range([0, size]);

	// Create polar coordinate gridline radii
	var gridlines_rs = [];
	for(var i=1; i != circles; i++) { gridlines_rs.push((i/Math.round((circles - 2) / 2 )) * size / 2) }	

	// Create svg and append to a div
	
	var main = d3.select("#"+dom_id)
	     .append('div')
	         .attr('id','main'+dom_id)  
	
	var chart_container = main.append('div')
	         .attr('id', 'chart_container'+dom_id)
	
	var chart_tr = chart_container.append('tr')

	// Create focusedMDS plot td
	var mainchart = chart_tr.append('td')
		 .attr('id', 'mainchart'+dom_id)

	var chart = mainchart.append('svg:svg')
		 	 .attr('width', size )
		 	 .attr('height', size )
		 	 .attr('class', 'chart')
		 	 .attr('id', 'chart_svg'+dom_id)
	  
	var g = chart.append('g')
		     .attr('width', size)
		     .attr('height', size)
		     .attr('class', 'main');

	// Create buttons sidebar td

	var chart_inset = chart_tr.append('td')
		 .attr('id', 'chart_inset'+dom_id)
		 .style('vertical-align', 'top')
		 .style('text-align', 'center')
		 	.append('table')
		 	.attr('width', buttonswidth + 'px')

	// If title given, create title tr
	if( data.title != "__notitle__") {
		var title_tr = chart_inset.append('tr').append('td')
	 		.append('text')
	 		.text(data.title)
	  	  	    .style('font-family', 'Georgia, serif')
	   		.style('font-size', '12px')
	 		.style('font-weight', 'bold')
	}		 

	// Create label checkbox and legend 
	var labelcheck = chart_inset.append('tr').append('td')

	var button = labelcheck.append('input')
		 .attr('type', 'checkbox')
		 .property('checked', false)

	chart_inset.select('input').on('change', function(d){ 
	 if (button.property('checked') == true) { 
		 g.selectAll('text')
		     .style('visibility', 'visible')
	 } else { 
		 g.selectAll('text')
				 .style('visibility', 'hidden')
		 }
	})

	var buttontext = labelcheck.append('text')
			 .text(' Show all labels')
	  	  	 .style('font-family', 'Georgia, serif')
	   	 .style('font-size', '12px')

	// Create slider and label
	var slider_text = chart_inset.append('tr').append('td')
			 .append('text')
			 .text('Circle size:')
			 .style('width', buttonswidth + "px")
	 	     .style('font-family', 'Georgia, serif')
	   	 .style('font-size', '12px')

	var sliderContainer = chart_inset.append('tr').append('td')
			 .append('svg')
	  	  	 .attr('height',20)
			 .attr('width', 140)

	 var slider = sliderContainer.append('g')
	    .attr('class', 'slider')
	    .attr('width', 150)

	slider.append('line')
	          .attr('class', 'track')
	          .attr('y1', 10)
	          .attr('y2', 10)
	          .attr('x1', 10)
	          .attr('x2', 130)
	          .style('stroke-linecap', 'round')
	          .style('stroke-opacity', 0.3)
	          .style('stroke-width', '8px')
	          .style('stroke', '#000')
	    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
	          .attr('class', 'track-inset')
	          .style('stroke-linecap', 'round')
	          .style('stroke', '#ddd')
	          .style('stroke-width', '3px')
	    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
	          .attr('class', 'track-overlay')
	          .style('stroke-linecap','round')
	          .style('pointer-events', 'stroke')
	          .style('stroke-width', '15px')
	          .style('cursor', 'crosshair')
	          .call(d3.drag()
	                  .on('start.interrupt', function() { slider.interrupt(); })
			       .on('start.drag', function() { sizeAdjust(d3.event.x); }))

	var handle = slider.insert('circle', '.track-overlay')
	          .attr('class','handle')
	          .attr('r', 4)
	          .attr('cx', 65)
	          .attr('cy', 10)
	          .style('fill', '#fff')
	          .style('stroke', '#000')
	          .style('stroke-opacity', '0.5')
	          .style('stroke-width', '1.25px')	

	function sizeAdjust(input) {
	 if(input < 10){
	 	handle.attr('cx', 10)
	 } else if(input > 130){
	 	handle.attr('cx', 130)
	 } else {
	 	handle.attr('cx', input)
	 };
 
	 g.selectAll('circle')
	     .attr('r', 0.2 * size/20 * input/65 );
 
	 sliderPosition = input;
	}
	 
	// Create spacer
	// var spacer = chart_inset.append('tr').append('td')
	// 		.append('svg')
	//  		.attr('width', buttonswidth)
	//  		.attr('height', '10px')
	//  			.append('rect')
	//  			.attr('width', buttonswidth)
	//  	   		.attr('height', '10px')
	//  			.attr('fill', 'white')
	
	// Create color legend
	var colorlegend = chart_inset.append('tr').append('td')
			.append('svg')
	 	.attr('width', buttonswidth)
			.attr('height', (legendboxsize * data.legend_data.categories.length))
			
	// Create color legend rectangles
	var dblclickpath = 0
	var clickpath = 0
	var clickvector = [];
	for( var i=0; i < data.legend_data.colors.length; i++) {
		clickvector.push(0)
	}
	colorlegend.selectAll('rect')
			.data(data.legend_data.colors)
			.enter().append('rect')
				.attr('class', 'legend'+dom_id)
				.attr('height', legendboxsize)
				.attr('width', legendboxsize)
				.attr('x', 10)
				.attr('y', function(d,i) { return (i * legendboxsize); })
			.attr('fill', function(d,i) { return d; })
				.on('mouseover', function(d,i) {
					if(clickpath == 0) {
					d3.selectAll(".data_points")
						.style('opacity', opacityval)
					d3.selectAll(".X" + data.legend_data.categories[i])
						.style('opacity', 1)
					}
				})
			.on('mouseout', function(d) {
				if(clickpath == 0) {
					d3.selectAll('.data_points')
						.style('opacity', 1)
				} 
			})
			.on('click', function(d,i) {
				if(clickvector[i] == 0 ) {
					d3.selectAll(".X" + data.legend_data.categories[i])
					   .style('opacity', 1)	
					clickvector[i] = 1
				} else if(clickvector[i] == 1) {
					d3.selectAll(".X" + data.legend_data.categories[i])
					   .style('opacity', opacityval)	
					clickvector[i] = 0
				}
				d3.select('#infotext'+dom_id)
					.style('visibility', 'visible')
				d3.select('#infotext2'+dom_id)
					.style('visibility', 'hidden')
				clickpath = 1
			})
			.on('dblclick', function() {
				d3.selectAll('.data_points')
					.style('opacity', 1)
				d3.select('#infotext'+dom_id)
					.style('visibility', 'hidden')
				d3.select('#infotext2'+dom_id)
					.style('visibility', 'visible')
				clickpath = 0
				clickvector = [];
	  			 	for( var i=0; i < data.legend_data.colors.length; i++) {
	  			 		clickvector.push(0)
	  			 	}
			})
	
	// Create color legend text
	colorlegend.selectAll('text')
			.data(data.legend_data.categories)
			.enter().append('text')
				.attr('class', 'legend'+dom_id)
				.attr('x', (legendboxsize + 15))
				.attr('y', function(d,i) { return (i * legendboxsize) + 15; })
				.text( function(d,i) { return d; })
	 	   	  	.style('font-family', 'Georgia, serif')
	   		.style('font-size', '12px')

	// If no legend given, hide it
	if( data.legend_data.categories[0] == "__nolegend__"){
		d3.selectAll(".legend"+dom_id).remove()
	}

	// Create infotext for exiting legend color stuff
	var infotext = chart_inset.append('tr').append('td')
			.append('text')
			.attr('id', 'infotext'+dom_id)
			.text('Double click legend to exit')
	 	    .style('font-family', 'Georgia, serif')
	   	.style('font-size', '12px')
			.style('opacity', 0.7)
			.style('visibility', 'hidden')

	// Create infotext2 for general info
	var infotext2 = chart_inset.append('tr').append('td')
			.append('text')
			.attr('id', 'infotext2'+dom_id)
			.text('Double click dot to re-focus plot. Click legend color block to highlight those data.')
	 	    .style('font-family', 'Georgia, serif')
	   	.style('font-size', '12px')
			.style('opacity', 0.7)
			.style('visibility', 'visible')
	
	// Create background bars
	g.selectAll("ellipse")
	 .data(gridlines_rs)
	 .enter().append("ellipse")
		 .attr("class", "polar_gridlines")
	     .attr("cx", function() {return (result[focus_point]['x'] + size/2 ); })
	     .attr("cy", function() {return (result[focus_point]['y'] + size/2 ); })
		 .attr("rx", function(d) { return d; })
	 	 .attr("ry", function(d) { return d; })
		 .attr("fill", "none")
		 .attr("stroke","gray")

	// Create scatterplot circles with clickable reordering
	g.selectAll("circle")
	    .data(data.ids)
	    .enter().append("circle")
		   .attr("class", function(d,i) { return "data_points " + "X"+color_categories[d] + " " + dom_id; })
			   .attr("cx", function(d,i) { return scale(result[d]['x']); })
			   .attr("cy", function(d,i) { return scale(result[d]['y']); })
			   .attr("r", 0.2 * size/20)
	          .attr("fill", function(d,i) { return color_object[d]})
			   .attr("stroke", function(d,i) { if(Object.keys(result).indexOf(d) == 0) { return "red"}})  
			   .on( "dblclick", function(d,i) {
				   var t0 = performance.now();
		   
			   // save phis from previous result for arc transition
				   old_result = {};
				   var old_keys = Object.keys(result)

				   var d_index = old_keys.indexOf(d)
				   
				  // console.log(result[old_keys[d_index]])
				   
				   for(var i=0; i< old_keys.length; i++){
					   old_result[old_keys[i]] = {
						   phi: result[old_keys[i]].phi,
						   r: result[old_keys[i]].r
					   }
			   		}
				   //console.log(old_result[d])
				   // update result object by rerunning focused_mds
				   result = focused_mds(data.distances, data.ids, d, data.tol)
			   	   focus_point = d

				   // update all circles
				   g.selectAll("circle")
				       .data(data.ids)
				       .transition()
				       .duration(3000)
				       .attrTween("cx", function(d,i) {
						   
						   var phiTween = d3.scaleLinear().range( [old_result[d].phi, result[d].phi] )
						   var rTween = d3.scaleLinear().range( [old_result[d].r, result[d].r] )
						   return function(t) { return scale( rTween(t) * cos( phiTween(t) ) )}
					   })
					   .attrTween("cy", function(d,i) {
						   var phiTween = d3.scaleLinear().range( [old_result[d].phi, result[d].phi] )
						   var rTween = d3.scaleLinear().range( [old_result[d].r, result[d].r] )
						   return function(t) { return scale( rTween(t) * sin( phiTween(t) ) )}
					   })
					   .attr("fill", function(d,i) { return color_object[d]; })
				   	   .attr("stroke", function(d,i) { if(Object.keys(result).indexOf(d) == 0) { return "red"}})

				   // update text locations
				   g.selectAll("text")
				   	   .data(data.ids)
				       .transition()
					   .duration(3000)
				       .attrTween("x", function(d,i) {
						   var phiTween = d3.scaleLinear().range( [old_result[d].phi, result[d].phi] )
						   var rTween = d3.scaleLinear().range( [old_result[d].r, result[d].r] )
						   return function(t) { return scale( rTween(t) * cos( phiTween(t) ) ) + size/100}
					   })
					   .attrTween("y", function(d,i) {
						   var phiTween = d3.scaleLinear().range( [old_result[d].phi, result[d].phi] )
						   var rTween = d3.scaleLinear().range( [old_result[d].r, result[d].r] )
						   return function(t) { return scale( rTween(t) * sin( phiTween(t) ) )}
					   })
					   .text( function (d) {return d })
			
				var t1 = performance.now()
			
				console.log("Updating time took " + ((t1 - t0)/1000) + "seconds")
			
			 	 })

				 .on("mouseover", function(d){
	  			     d3.select("text#X"+d+dom_id)	 	 
					     .style("visibility","visible")
			     })
		         .on("mouseout", function(d){
				 if( button.property('checked') == false ){
	 			         d3.select("text#X"+d+dom_id)
				  	         .style("visibility","hidden")
				 } 
			     })
			     ;
	
	// Add svg text element to g
	var text = g.selectAll("text")
	            .data(data.ids)
	            .enter()
	            .append("text")
			    .attr("id",function(d){return "X"+d+dom_id;})
			    .attr("class","textLabels")

	// Create text labels	
	var textLabels = text
	  	  		     .attr('x', function(d,i) {return scale(result[d]['x']) + size/100; })
					 .attr('y', function(d,i) {return scale(result[d]['y']); })
					 .text( function (d) {return d })
					 .attr("font-family", "sans-serif")
					 .attr("font-size", "12px")
					 .attr("fill", "black")
					 .style("visibility","hidden") 
	
}


