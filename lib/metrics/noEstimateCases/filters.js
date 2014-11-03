var util = require("util");

module.exports = function(streamler){

  var through2 = streamler.through2;

  /************FILTERS********************/
  streamler
    .addFilter('noEstimatetickets', function(){
      return through2.call(this, function(data){
      	if( data['hrsCurrEst']==='0' ){
  	        this.emit("data", data);
      	}
      });
    })
    .addFilter('accumulateMap',function(){
    	return through2.call(this,function(ticket){
    		  var id =ticket.ixFixFor, 
          accum = this.root.noEstimateAccumulator[id];
            if(!accum){
            	accum=this.root.noEstimateAccumulator[id]={noEstimateCases:0};
            }
            accum.noEstimateCases++;
            this.emit('data',ticket);
    	})
    })
    .addFilter('milestones', function(){      
      return through2.call(this, function(milestone){
        this.emit("data", streamler.extend( milestone, this.root.noEstimateAccumulator[milestone.ixFixFor] ) );
      });
    });

}
