"use strict";

function distnetR(data, dom_id, width, height) {
	
	
	var distMatrix = data.distmat;
	var points2D = data.pointpos;
	var colors = data.colors;
	var labels = data.labels;
	
	var main = d3.select("#"+dom_id)
	.style("padding", "10px");

	  main.append("div")
	    .attr( "id", "chart" );

	  var info = main.append("p")
	    .html( "&nbsp;" )
	    .attr( "id", "info" )
	    .style( "margin-top", "0px")
	    .style( "margin-bottom", "10px")
	    .style( "margin-left", "0px")
	    .style( "margin-right", "0px");

	  main.append("div")
	    .attr( "id", "slider" );

	  var obj = {};

	  var dark = d3.rgb( 0, 0, 90 )

	  var pacer = call_pacer( 20 );

	  obj.slider = lc.sigmoidColorSlider()
	     .straightColorScale( d3.scaleLinear()
	        .range( [ dark, "white" ] )
	        .domain( [ 0, d3.max( d3.max( distMatrix ) ) ] ) )
	     .on_drag( function() {
	        console.log("A")
	        pacer.do( function() {
	          // We should call 'update' here, but for performance reasons, we
	          // only call the part of update that redresses the edges.
	          obj.chart.get_layer("graph").get_edge_dresser( d3.selectAll(".graph_edge") );
	        } )
	     });

	  obj.chart = simpleGraph( "graph" )
	     .aspectRatio( 1 )
	     .npoints( points2D.length )
	     .x( function(i) { return points2D[i][0] } )
	     .y( function(i) { return points2D[i][1] } )
	     .size( 6 )
	     .transitionDuration( 0 )
	     .edge_present( function( i, j ) { return obj.slider.the_sigmoid( distMatrix[i][j] ) < .9 } )
	     .edge_dresser( function( sel ) { 
	        sel
	          .style( "stroke", dark )
	          .style( "stroke-opacity", function(d) { 
	            return 1 - obj.slider.the_sigmoid( distMatrix[d[0]][d[1]] ); } ) } )
	     .vertex_dresser( function( sel ) {
	        sel
	          .style( "fill", function(d) { return colors[d] } )
	          .on( "mouseover", function(d) { info.text( labels[d] ) } )
	          .on( "mouseout", function(d) { info.html( "&nbsp;" ) } );
	     })

	  obj.resize = function( width, height, no_update ) {
	      obj.slider
	         .width( width );
	      obj.chart
	         .width( width )
	         .height( height - obj.slider.get_height() - obj.slider.get_margin().top - 
	            obj.slider.get_margin().bottom - 12 - 10 - d3.select("#info").node().getBoundingClientRect().height )
	         .margin( { top: 2, right: 2, bottom: 10, left: 2 } );
	      if( !no_update ) {
	         obj.chart.update();
	         obj.slider.update();
	      }
	   } 

	   obj.resize( width, height, true );

	   obj.slider.place( "#slider" );
	   obj.chart.place( "#chart" );

	   return obj;

	 
}


// Auxiliary functions

function rmpx( s ) {
  return parseInt( s.replace("px", "") );
}

