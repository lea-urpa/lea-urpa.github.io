function call_pacer( interval ) {

   /*
   This "call pacer" serves to avoid jerky appearance when a redraw
   function is triggered to often because events fire to rapidly.
   
   Say, you have a handler, e.g., for a 'drag' event, which is supposed
   to call an 'update' function. Usually you would write

      some_object.on( "drag", update );

   If 'update' is complex, you may want to make sure that it is not called
   more often than, say, once in 30 ms. If the drag event fires more often,
   intermittant calls to 'update' should be skipped. For this, write.

     var pacer = call_pacer( 30 );
     some_object.on( "drag", function() { pacer.do( update ) } )

   Now, pacer.do will call 'update', but only if the last call was more than
   30 ms ago. It also ensures that after a lapse of more than 30 ms without
   event, the last lapsed call is then called, to draw the final state.
   */

   obj = {
      interval: interval,
      prev_time: -Infinity,
      timer: null }

   obj.do = function( callback ) {
      if( obj.timer )
         obj.timer.stop();
      if( d3.now() - obj.prev_time >= interval ) {         
         callback();
         obj.prev_time = d3.now();
      } else {
         obj.timer = d3.timeout( callback, 1.5 * interval )
      }
   }

   return obj;
}
